import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThan } from 'typeorm';
import {
  ATTACHMENT_OBJECT_STORE,
  type AttachmentObjectStore,
} from '../attachment-storage/attachment-object-store';
import { EnvVars, NodeEnv } from '../config/env.validation';
import { AttachmentObjectCleanup } from './attachment-object-cleanup.entity';

export const ATTACHMENT_CLEANUP_STORE = Symbol('ATTACHMENT_CLEANUP_STORE');

const BATCH_SIZE = 25;
const LEASE_MS = 5 * 60 * 1000;
const FIRST_RETRY_MS = 60 * 1000;
const MAX_RETRY_MS = 24 * 60 * 60 * 1000;
const COMPLETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SCHEDULE_MS = 60 * 1000;
const SHUTDOWN_WAIT_MS = 5 * 1000;

export interface AttachmentCleanupJob {
  id: string;
  objectKey: string;
  attempts: number;
  claimedAt: Date;
  recoveredLease: boolean;
}

export interface AttachmentCleanupStore {
  claim(
    now: Date,
    batchSize: number,
    leaseMs: number,
  ): Promise<AttachmentCleanupJob[]>;
  renew(id: string, claimedAt: Date, renewedAt: Date): Promise<boolean>;
  complete(id: string, claimedAt: Date, completedAt: Date): Promise<boolean>;
  retry(input: {
    id: string;
    claimedAt: Date;
    attempts: number;
    nextAttemptAt: Date;
    lastError: string;
  }): Promise<boolean>;
  purgeCompleted(completedBefore: Date): Promise<void>;
}

@Injectable()
export class TypeOrmAttachmentCleanupStore implements AttachmentCleanupStore {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  claim(
    now: Date,
    batchSize: number,
    leaseMs: number,
  ): Promise<AttachmentCleanupJob[]> {
    return this.dataSource.transaction(async (manager) => {
      const expiredBefore = new Date(now.getTime() - leaseMs);
      const jobs = await manager
        .createQueryBuilder(AttachmentObjectCleanup, 'cleanup')
        .where('cleanup.completedAt IS NULL')
        .andWhere('cleanup.deleteAfter <= :now', { now })
        .andWhere('cleanup.nextAttemptAt <= :now', { now })
        .andWhere(
          '(cleanup.lockedAt IS NULL OR cleanup.lockedAt < :expiredBefore)',
          { expiredBefore },
        )
        .orderBy('cleanup.nextAttemptAt', 'ASC')
        .addOrderBy('cleanup.id', 'ASC')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .take(batchSize)
        .getMany();
      if (!jobs.length) return [];
      await manager.update(
        AttachmentObjectCleanup,
        jobs.map(({ id }) => id),
        { lockedAt: now },
      );
      return jobs.map(({ id, objectKey, attempts, lockedAt }) => ({
        id,
        objectKey,
        attempts,
        claimedAt: now,
        recoveredLease: lockedAt !== null,
      }));
    });
  }

  async renew(id: string, claimedAt: Date, renewedAt: Date): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(AttachmentObjectCleanup)
      .update(
        { id, lockedAt: claimedAt, completedAt: IsNull() },
        { lockedAt: renewedAt },
      );
    return result.affected === 1;
  }

  async complete(
    id: string,
    claimedAt: Date,
    completedAt: Date,
  ): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(AttachmentObjectCleanup)
      .update(
        { id, lockedAt: claimedAt, completedAt: IsNull() },
        { completedAt, lockedAt: null, lastError: null },
      );
    return result.affected === 1;
  }

  async retry(input: {
    id: string;
    claimedAt: Date;
    attempts: number;
    nextAttemptAt: Date;
    lastError: string;
  }): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(AttachmentObjectCleanup)
      .update(
        { id: input.id, lockedAt: input.claimedAt, completedAt: IsNull() },
        {
          attempts: input.attempts,
          nextAttemptAt: input.nextAttemptAt,
          lastError: input.lastError,
          lockedAt: null,
        },
      );
    return result.affected === 1;
  }

  async purgeCompleted(completedBefore: Date): Promise<void> {
    await this.dataSource.getRepository(AttachmentObjectCleanup).delete({
      completedAt: LessThan(completedBefore),
      lockedAt: IsNull(),
    });
  }
}

@Injectable()
export class AttachmentCleanupWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AttachmentCleanupWorker.name);
  private active?: Promise<void>;
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(ATTACHMENT_CLEANUP_STORE)
    private readonly store: AttachmentCleanupStore,
    @Inject(ATTACHMENT_OBJECT_STORE)
    private readonly objects: AttachmentObjectStore,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get('NODE_ENV') === NodeEnv.Test) return;
    await this.runScheduledCycle();
    this.timer = setInterval(() => void this.runScheduledCycle(), SCHEDULE_MS);
    this.timer.unref();
  }

  processDue(now?: Date): Promise<void> {
    if (this.active) return this.active;
    const active = this.run(now ?? new Date(), now).finally(() => {
      if (this.active === active) this.active = undefined;
    });
    this.active = active;
    return active;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (!this.active) return;
    await Promise.race([
      this.active.catch((error) => this.logCycleFailure(error)),
      new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, SHUTDOWN_WAIT_MS);
        timeout.unref();
      }),
    ]);
  }

  private async run(now: Date, fixedNow?: Date): Promise<void> {
    await this.store.purgeCompleted(
      new Date(now.getTime() - COMPLETED_RETENTION_MS),
    );
    const jobs = await this.store.claim(now, BATCH_SIZE, LEASE_MS);
    for (const job of jobs) {
      if (job.recoveredLease) {
        this.logger.warn(
          JSON.stringify({
            event: 'attachment_cleanup_lease_recovered',
            cleanupJobId: job.id,
            objectKey: job.objectKey,
          }),
        );
      }
      const startedAt = fixedNow ?? new Date();
      if (!(await this.store.renew(job.id, job.claimedAt, startedAt))) continue;
      const heartbeat = fixedNow
        ? undefined
        : this.startLeaseHeartbeat(job.id, startedAt);
      try {
        await this.objects.delete(job.objectKey);
        const lease = heartbeat
          ? await heartbeat.stop()
          : { owned: true, claimedAt: startedAt };
        if (!lease.owned) continue;
        await this.store.complete(
          job.id,
          lease.claimedAt,
          fixedNow ?? new Date(),
        );
      } catch (error) {
        const lease = heartbeat
          ? await heartbeat.stop()
          : { owned: true, claimedAt: startedAt };
        if (!lease.owned) continue;
        const attempts = job.attempts + 1;
        const failedAt = fixedNow ?? new Date();
        const retryMs = Math.min(
          FIRST_RETRY_MS * 2 ** (attempts - 1),
          MAX_RETRY_MS,
        );
        const lastError = errorMessage(error);
        await this.store.retry({
          id: job.id,
          claimedAt: lease.claimedAt,
          attempts,
          nextAttemptAt: new Date(failedAt.getTime() + retryMs),
          lastError,
        });
        if (attempts >= 5) {
          this.logger.error(
            JSON.stringify({
              event: 'attachment_cleanup_retry',
              cleanupJobId: job.id,
              objectKey: job.objectKey,
              attempts,
            }),
          );
        }
      }
    }
  }

  private startLeaseHeartbeat(jobId: string, initialClaimedAt: Date) {
    let claimedAt = initialClaimedAt;
    let owned = true;
    let pending = Promise.resolve();
    const timer = setInterval(() => {
      pending = pending
        .then(async () => {
          if (!owned) return;
          const renewedAt = new Date();
          owned = await this.store.renew(jobId, claimedAt, renewedAt);
          if (owned) claimedAt = renewedAt;
        })
        .catch((error) => {
          owned = false;
          this.logCycleFailure(error);
        });
    }, LEASE_MS / 2);
    timer.unref();
    return {
      stop: async () => {
        clearInterval(timer);
        await pending;
        return { owned, claimedAt };
      },
    };
  }

  private async runScheduledCycle(): Promise<void> {
    try {
      await this.processDue();
    } catch (error) {
      this.logCycleFailure(error);
    }
  }

  private logCycleFailure(error: unknown): void {
    this.logger.error(
      JSON.stringify({
        event: 'attachment_cleanup_cycle_failed',
        error: errorMessage(error),
      }),
    );
  }
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\p{Cc}+/gu, ' ').slice(0, 1000);
}
