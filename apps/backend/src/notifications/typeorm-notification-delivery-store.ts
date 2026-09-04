import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  FRONTEND_ORIGINS,
  type FrontendOrigins,
} from '../common/frontend-origins';
import {
  DEFAULT_NOTIFICATION_EMAIL_MODE,
  NotificationEmailMode,
} from '../notification-preferences/notification-preference.entity';
import {
  NotificationDelivery,
  NotificationDeliveryStatus,
} from './notification-delivery.entity';
import {
  type NotificationDeliveryJob,
  type NotificationDeliveryStore,
  type PreparedNotificationDelivery,
} from './notification-delivery-worker';
import {
  evaluateDeliveryEligibility,
  type DeliveryCancellationReason,
  type DeliveryEligibilityInput,
} from './notification-delivery-policy';
import { NotificationType } from './notification.entity';
import { NOTIFICATION_TYPES } from './notification-types';
import {
  NOTIFICATION_DELIVERY_TYPE_ADAPTERS,
  type NotificationDeliveryTypeAdapter,
  type NotificationDeliveryTypePreparation,
} from './notification-delivery-type-adapter';

interface DeliveryPreparationRow {
  id: string;
  companyId: string;
  recipientAddress: string | null;
  notificationId: string;
  notificationType: NotificationType;
  rendererVersion: number;
  invalidatedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  membershipId: string;
  membershipStatus: string | null;
  userId: string | null;
  email: string | null;
  emailVerifiedAt: Date | null;
  userDeletedAt: Date | null;
  emailMode: NotificationEmailMode | null;
}

function resolveRecipientAddress(row: DeliveryPreparationRow): string | null {
  const currentVerifiedAddress =
    row.emailVerifiedAt !== null && row.userDeletedAt === null
      ? row.email
      : null;
  return row.recipientAddress ?? currentVerifiedAddress;
}

function buildEligibilityInput(
  row: DeliveryPreparationRow,
  now: Date,
  source: NotificationDeliveryTypePreparation,
  address: string | null,
): DeliveryEligibilityInput {
  return {
    notificationValid:
      row.invalidatedAt === null &&
      (row.expiresAt === null || row.expiresAt > now) &&
      source.sourceValid,
    membershipActive: row.membershipStatus === 'active' && row.userId !== null,
    sourceAuthorized: source.sourceAuthorized && row.revokedAt === null,
    emailPolicy: NOTIFICATION_TYPES[row.notificationType].emailPolicy,
    optionalEmailEnabled:
      (row.emailMode ?? DEFAULT_NOTIFICATION_EMAIL_MODE) ===
      NotificationEmailMode.IMMEDIATE,
    hasRecipientAddress: address !== null,
  };
}

@Injectable()
export class TypeOrmNotificationDeliveryStore implements NotificationDeliveryStore {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(NOTIFICATION_DELIVERY_TYPE_ADAPTERS)
    private readonly typeAdapters: NotificationDeliveryTypeAdapter[],
    @Inject(FRONTEND_ORIGINS)
    private readonly frontendOrigins: FrontendOrigins,
  ) {}

  claim(
    now: Date,
    batchSize: number,
    leaseMs: number,
  ): Promise<NotificationDeliveryJob[]> {
    return this.dataSource.transaction(async (manager) => {
      const expiredBefore = new Date(now.getTime() - leaseMs);
      const deliveries = await manager
        .createQueryBuilder(NotificationDelivery, 'delivery')
        .where('delivery.channel = :channel', { channel: 'EMAIL' })
        .andWhere('delivery.completedAt IS NULL')
        .andWhere('delivery.nextAttemptAt <= :now', { now })
        .andWhere(
          `(
          (delivery.status = 'PENDING' AND delivery.lockedAt IS NULL)
          OR (delivery.status = 'SENDING' AND delivery.lockedAt < :expiredBefore)
        )`,
          { expiredBefore },
        )
        .orderBy('delivery.nextAttemptAt', 'ASC')
        .addOrderBy('delivery.id', 'ASC')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .take(batchSize)
        .getMany();
      if (!deliveries.length) return [];
      for (const delivery of deliveries) {
        await manager.update(NotificationDelivery, delivery.id, {
          status: NotificationDeliveryStatus.SENDING,
          lockedAt: now,
        });
      }
      return deliveries.map((delivery) => ({
        id: delivery.id,
        attempts: delivery.attempts,
        claimedAt: now,
        recoveredLease: delivery.status === NotificationDeliveryStatus.SENDING,
      }));
    });
  }

  prepare(
    id: string,
    claimedAt: Date,
    now: Date,
  ): Promise<PreparedNotificationDelivery | null> {
    return this.dataSource.transaction(async (manager) => {
      const row = await this.preparationRow(manager, id, claimedAt);
      if (!row) return null;
      const adapter = this.typeAdapters.find(
        (candidate) => candidate.type === row.notificationType,
      );
      if (!adapter) {
        throw new Error(`Missing delivery adapter for ${row.notificationType}`);
      }
      const source = await adapter.prepare(manager, {
        companyId: row.companyId,
        notificationId: row.notificationId,
        membershipId: row.membershipId,
        userId: row.userId,
        rendererVersion: row.rendererVersion,
        frontendBaseUrl: this.frontendOrigins.resolveLinkBase(),
      });
      const address = resolveRecipientAddress(row);
      const eligibility = evaluateDeliveryEligibility(
        buildEligibilityInput(row, now, source, address),
      );
      if (!eligibility.eligible) {
        return { kind: 'cancel', reason: eligibility.reason };
      }
      if (!row.recipientAddress) {
        const captured = await this.captureRecipientAddress(
          manager,
          id,
          claimedAt,
          address,
        );
        if (!captured) return null;
      }
      if (!source.rendered) {
        throw new Error(
          `Delivery adapter did not render ${row.notificationType}`,
        );
      }
      return { kind: 'send', to: address!, ...source.rendered };
    });
  }

  completeSent(input: {
    id: string;
    claimedAt: Date;
    attempts: number;
    providerMessageId: string;
    sentAt: Date;
  }): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const accepted = await this.ownedUpdate(manager, input, {
        providerMessageId: input.providerMessageId,
        attempts: input.attempts,
      });
      if (!accepted) return false;
      const result = await this.ownedUpdate(manager, input, {
        status: NotificationDeliveryStatus.SENT,
        sentAt: input.sentAt,
        completedAt: input.sentAt,
        lockedAt: null,
        lastError: null,
      });
      return result;
    });
  }

  async cancel(input: {
    id: string;
    claimedAt: Date;
    reason: DeliveryCancellationReason;
    completedAt: Date;
  }): Promise<boolean> {
    return this.ownedUpdate(this.dataSource.manager, input, {
      status: NotificationDeliveryStatus.CANCELLED,
      completedAt: input.completedAt,
      lockedAt: null,
      lastError: input.reason,
    });
  }

  async retry(input: {
    id: string;
    claimedAt: Date;
    attempts: number;
    nextAttemptAt: Date;
    lastError: string;
  }): Promise<boolean> {
    return this.ownedUpdate(this.dataSource.manager, input, {
      status: NotificationDeliveryStatus.PENDING,
      attempts: input.attempts,
      nextAttemptAt: input.nextAttemptAt,
      lastError: input.lastError,
      lockedAt: null,
    });
  }

  async fail(input: {
    id: string;
    claimedAt: Date;
    attempts: number;
    lastError: string;
    completedAt: Date;
  }): Promise<boolean> {
    return this.ownedUpdate(this.dataSource.manager, input, {
      status: NotificationDeliveryStatus.FAILED,
      attempts: input.attempts,
      lastError: input.lastError,
      completedAt: input.completedAt,
      lockedAt: null,
    });
  }

  private async preparationRow(
    manager: EntityManager,
    id: string,
    claimedAt: Date,
  ): Promise<DeliveryPreparationRow | undefined> {
    const rows = await manager.query<DeliveryPreparationRow[]>(
      `SELECT delivery.id, delivery."companyId", delivery."recipientAddress",
              notification.id AS "notificationId", notification.type AS "notificationType",
              notification."rendererVersion", notification."invalidatedAt", notification."expiresAt",
              recipient."revokedAt", recipient."membershipId",
              membership.status AS "membershipStatus", membership."userId",
              app_user.email, app_user."emailVerifiedAt", app_user."deletedAt" AS "userDeletedAt",
              preference."emailMode"
         FROM notification_deliveries delivery
         JOIN notification_recipients recipient
           ON recipient.id = delivery."recipientId" AND recipient."companyId" = delivery."companyId"
         JOIN notifications notification
           ON notification.id = recipient."notificationId" AND notification."companyId" = recipient."companyId"
         LEFT JOIN memberships membership
           ON membership.id = recipient."membershipId" AND membership."companyId" = recipient."companyId"
         LEFT JOIN users app_user ON app_user.id = membership."userId"
         LEFT JOIN notification_preferences preference
           ON preference."companyId" = recipient."companyId"
          AND preference."membershipId" = recipient."membershipId"
          AND preference.category = notification.category
        WHERE delivery.id = $1
          AND delivery.status = 'SENDING'
          AND delivery."lockedAt" = $2
          AND delivery."completedAt" IS NULL
        FOR UPDATE OF delivery`,
      [id, claimedAt],
    );
    return rows[0];
  }

  private async captureRecipientAddress(
    manager: EntityManager,
    id: string,
    claimedAt: Date,
    address: string | null,
  ): Promise<boolean> {
    const captured = await manager
      .createQueryBuilder()
      .update(NotificationDelivery)
      .set({ recipientAddress: address })
      .where('id = :id', { id })
      .andWhere('status = :status', {
        status: NotificationDeliveryStatus.SENDING,
      })
      .andWhere('lockedAt = :claimedAt', { claimedAt })
      .andWhere('recipientAddress IS NULL')
      .andWhere('completedAt IS NULL')
      .execute();
    return captured.affected === 1;
  }

  private async ownedUpdate(
    manager: EntityManager,
    owner: { id: string; claimedAt: Date },
    fields: Partial<NotificationDelivery>,
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(NotificationDelivery)
      .set(fields)
      .where('id = :id', { id: owner.id })
      .andWhere('status = :status', {
        status: NotificationDeliveryStatus.SENDING,
      })
      .andWhere('lockedAt = :claimedAt', { claimedAt: owner.claimedAt })
      .andWhere('completedAt IS NULL')
      .execute();
    return result.affected === 1;
  }
}
