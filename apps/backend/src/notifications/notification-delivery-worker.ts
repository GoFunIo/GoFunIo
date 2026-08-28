import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { EnvVars, NodeEnv } from '../config/env.validation';
import {
  deliveryRetryDelayMs,
  notificationDeliveryFailure,
} from './notification-delivery-failure';
import { DeliveryCancellationReason } from './notification-delivery-policy';
import {
  NOTIFICATION_EMAIL_SENDER,
  type NotificationEmailSender,
} from './notification-email-sender';
import { NOTIFICATION_DELIVERY_COMMITTED } from './notification-delivery-events';

export const NOTIFICATION_DELIVERY_STORE = Symbol(
  'NOTIFICATION_DELIVERY_STORE',
);

const BATCH_SIZE = 25;
const LEASE_MS = 5 * 60 * 1000;
const SCHEDULE_MS = 15 * 60 * 1000;
const SHUTDOWN_WAIT_MS = 5 * 1000;

export interface NotificationDeliveryJob {
  id: string;
  attempts: number;
  claimedAt: Date;
  recoveredLease: boolean;
}

export type PreparedNotificationDelivery =
  | {
      kind: 'send';
      to: string;
      subject: string;
      text: string;
      html: string;
    }
  | { kind: 'cancel'; reason: DeliveryCancellationReason };

interface LeaseCompletion {
  id: string;
  claimedAt: Date;
}

export interface NotificationDeliveryStore {
  claim(
    now: Date,
    batchSize: number,
    leaseMs: number,
  ): Promise<NotificationDeliveryJob[]>;
  prepare(
    id: string,
    claimedAt: Date,
    now: Date,
  ): Promise<PreparedNotificationDelivery | null>;
  completeSent(
    input: LeaseCompletion & {
      attempts: number;
      providerMessageId: string;
      sentAt: Date;
    },
  ): Promise<boolean>;
  cancel(
    input: LeaseCompletion & {
      reason: DeliveryCancellationReason;
      completedAt: Date;
    },
  ): Promise<boolean>;
  retry(
    input: LeaseCompletion & {
      attempts: number;
      nextAttemptAt: Date;
      lastError: string;
    },
  ): Promise<boolean>;
  fail(
    input: LeaseCompletion & {
      attempts: number;
      lastError: string;
      completedAt: Date;
    },
  ): Promise<boolean>;
}

@Injectable()
export class NotificationDeliveryWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationDeliveryWorker.name);
  private active?: Promise<void>;
  private timer?: NodeJS.Timeout;
  private wakeQueued = false;

  constructor(
    @Inject(NOTIFICATION_DELIVERY_STORE)
    private readonly store: NotificationDeliveryStore,
    @Inject(NOTIFICATION_EMAIL_SENDER)
    private readonly sender: NotificationEmailSender,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV') === NodeEnv.Test) return;
    void this.runScheduledCycle();
    this.timer = setInterval(() => void this.runScheduledCycle(), SCHEDULE_MS);
    this.timer.unref();
  }

  processDue(now?: Date): Promise<void> {
    if (this.active) return this.active;
    const fixedNow = now;
    const active = this.run(now ?? new Date(), fixedNow).finally(() => {
      if (this.active === active) this.active = undefined;
    });
    this.active = active;
    return active;
  }

  wake(): void {
    if (this.config.get('NODE_ENV') === NodeEnv.Test || this.wakeQueued) {
      return;
    }
    this.wakeQueued = true;
    queueMicrotask(() => {
      const activeAtWake = this.active;
      void (activeAtWake ?? Promise.resolve())
        .catch((error) => this.logCycleFailure(error))
        .then(async () => {
          this.wakeQueued = false;
          await this.runScheduledCycle();
        });
    });
  }

  @OnEvent(NOTIFICATION_DELIVERY_COMMITTED)
  onDeliveryCommitted(): void {
    this.wake();
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
    const jobs = await this.store.claim(now, BATCH_SIZE, LEASE_MS);
    for (const job of jobs) {
      if (job.recoveredLease) {
        this.logger.warn(
          JSON.stringify({
            event: 'notification_delivery_lease_recovered',
            deliveryId: job.id,
          }),
        );
      }
      const prepared = await this.store.prepare(
        job.id,
        job.claimedAt,
        fixedNow ?? new Date(),
      );
      if (!prepared) continue;
      if (prepared.kind === 'cancel') {
        const completedAt = fixedNow ?? new Date();
        if (
          await this.store.cancel({
            id: job.id,
            claimedAt: job.claimedAt,
            reason: prepared.reason,
            completedAt,
          })
        ) {
          this.logger.log(
            JSON.stringify({
              event: 'notification_delivery_cancelled',
              deliveryId: job.id,
              reason: prepared.reason,
            }),
          );
        }
        continue;
      }
      const attempts = job.attempts + 1;
      try {
        const accepted = await this.sender.send({
          to: prepared.to,
          subject: prepared.subject,
          text: prepared.text,
          html: prepared.html,
          idempotencyKey: job.id,
        });
        const sentAt = fixedNow ?? new Date();
        if (
          await this.store.completeSent({
            id: job.id,
            claimedAt: job.claimedAt,
            attempts,
            providerMessageId: accepted.providerMessageId,
            sentAt,
          })
        ) {
          this.logger.log(
            JSON.stringify({
              event: 'notification_delivery_sent',
              deliveryId: job.id,
              attempts,
            }),
          );
        }
      } catch (error) {
        const failure = notificationDeliveryFailure(error);
        const failedAt = fixedNow ?? new Date();
        if (failure.transient) {
          if (
            await this.store.retry({
              id: job.id,
              claimedAt: job.claimedAt,
              attempts,
              nextAttemptAt: new Date(
                failedAt.getTime() + deliveryRetryDelayMs(attempts),
              ),
              lastError: failure.diagnostic,
            })
          ) {
            this.logger.warn(
              JSON.stringify({
                event: 'notification_delivery_retry',
                deliveryId: job.id,
                attempts,
                diagnostic: failure.diagnostic,
              }),
            );
          }
        } else {
          if (
            await this.store.fail({
              id: job.id,
              claimedAt: job.claimedAt,
              attempts,
              lastError: failure.diagnostic,
              completedAt: failedAt,
            })
          ) {
            this.logger.error(
              JSON.stringify({
                event: 'notification_delivery_failed',
                deliveryId: job.id,
                attempts,
                diagnostic: failure.diagnostic,
              }),
            );
          }
        }
      }
    }
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
        event: 'notification_delivery_cycle_failed',
        errorType:
          error instanceof Error ? error.constructor.name : 'UnknownError',
      }),
    );
  }
}
