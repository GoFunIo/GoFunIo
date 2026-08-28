import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { CLOCK, type Clock } from '../common/clock';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import {
  TRANSACTIONAL_VEHICLE_ACCESS,
  type TransactionalVehicleAccess,
} from '../fleet/transactional-vehicle-access';
import {
  NotificationEmailMode,
  NotificationPreference,
} from '../notification-preferences/notification-preference.entity';
import {
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryStatus,
} from './notification-delivery.entity';
import { NotificationType } from './notification.entity';
import {
  NOTIFICATION_TYPES,
  NotificationEmailPolicy,
} from './notification-types';
import {
  type TransactionalNotificationRecipientReconciliation,
  type VehicleDeadlineRecipientReconciliationScope,
} from './transactional-notification-recipient-reconciliation';
import { selectCurrentVehicleDeadlineStage } from './vehicle-deadline-stage';
import {
  VEHICLE_DEADLINE_SOURCE_VALIDITY_JOINS,
  VEHICLE_DEADLINE_SOURCE_VALIDITY_PREDICATE,
} from './vehicle-deadline-source-validity';

@Injectable()
export class VehicleDeadlineRecipientReconciler implements TransactionalNotificationRecipientReconciliation {
  constructor(
    private readonly calendar: WorkspaceCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(TRANSACTIONAL_VEHICLE_ACCESS)
    private readonly vehicleAccess: TransactionalVehicleAccess,
  ) {}

  async reconcileRecipients(
    manager: EntityManager,
    input: VehicleDeadlineRecipientReconciliationScope,
  ): Promise<void> {
    await this.revokeIneligibleRecipients(manager, input);
    const params: unknown[] = [input.companyId];
    const filters = ['detail."companyId" = $1'];
    if (input.vehicleIds?.length) {
      params.push(input.vehicleIds);
      filters.push(`detail."vehicleId" = ANY($${params.length}::uuid[])`);
    }
    const rows = await manager.query<
      Array<{
        notificationId: string;
        deadlineDate: string;
        leadDay: number;
        leadDays: number[];
        timeZone: string;
      }>
    >(
      `SELECT detail."notificationId", to_char(detail."deadlineDate", 'YYYY-MM-DD') AS "deadlineDate",
              detail."leadDay", policy."leadDays", policy."timeZone"
       FROM vehicle_deadline_notification_details detail
       JOIN notifications notification
         ON notification.id = detail."notificationId" AND notification."companyId" = detail."companyId"
       ${VEHICLE_DEADLINE_SOURCE_VALIDITY_JOINS}
       WHERE ${filters.join(' AND ')}
         AND ${VEHICLE_DEADLINE_SOURCE_VALIDITY_PREDICATE}`,
      params,
    );
    const notificationIds = rows
      .filter((row) => {
        const localNow = this.calendar.now(row.timeZone);
        return (
          selectCurrentVehicleDeadlineStage({
            deadlineDate: row.deadlineDate,
            leadDays: row.leadDays,
            localNow,
          }) === row.leadDay
        );
      })
      .map(({ notificationId }) => notificationId);
    await this.addRecipientsForNotifications(
      manager,
      notificationIds,
      input.userIds,
    );
  }

  async addRecipientsForNotifications(
    manager: EntityManager,
    notificationIds: string[],
    userIds?: string[],
  ): Promise<void> {
    if (!notificationIds.length) return;
    const sources = await manager.query<
      Array<{
        companyId: string;
        notificationId: string;
        vehicleId: string;
      }>
    >(
      `SELECT detail."companyId", detail."notificationId", detail."vehicleId"
       FROM vehicle_deadline_notification_details detail
       WHERE detail."notificationId" = ANY($1::uuid[])`,
      [notificationIds],
    );
    const eligible: Array<{
      companyId: string;
      notificationId: string;
      membershipId: string;
    }> = [];
    for (const companyId of new Set(
      sources.map((source) => source.companyId),
    )) {
      const companySources = sources.filter(
        (source) => source.companyId === companyId,
      );
      const authorized = await this.vehicleAccess.authorizedMemberships(
        manager,
        companyId,
        [...new Set(companySources.map(({ vehicleId }) => vehicleId))],
        userIds,
      );
      const byVehicle = new Map<string, string[]>();
      for (const membership of authorized) {
        const membershipIds = byVehicle.get(membership.vehicleId) ?? [];
        membershipIds.push(membership.membershipId);
        byVehicle.set(membership.vehicleId, membershipIds);
      }
      for (const source of companySources) {
        for (const membershipId of byVehicle.get(source.vehicleId) ?? []) {
          eligible.push({
            companyId,
            notificationId: source.notificationId,
            membershipId,
          });
        }
      }
    }
    const inserted: Array<{
      id: string;
      companyId: string;
      membershipId: string;
    }> = [];
    for (const candidate of eligible) {
      const recipients = await manager.query<
        Array<{ id: string; companyId: string; membershipId: string }>
      >(
        `INSERT INTO notification_recipients
           ("companyId", "notificationId", "membershipId", "readAt", "archivedAt", "revokedAt")
         VALUES ($1, $2, $3, NULL, NULL, NULL)
         ON CONFLICT ("companyId", "notificationId", "membershipId") DO NOTHING
         RETURNING id, "companyId", "membershipId"`,
        [candidate.companyId, candidate.notificationId, candidate.membershipId],
      );
      inserted.push(...recipients);
    }
    if (!inserted.length) return;
    const contract =
      NOTIFICATION_TYPES[NotificationType.VEHICLE_DEADLINE_REACHED];
    const preferences = await manager.find(NotificationPreference, {
      where: {
        membershipId: In(inserted.map(({ membershipId }) => membershipId)),
        category: contract.category,
      },
    });
    const preferencesByMembership = new Map(
      preferences.map((preference) => [preference.membershipId, preference]),
    );
    for (const recipient of inserted) {
      const preference = preferencesByMembership.get(recipient.membershipId);
      const createDelivery =
        contract.emailPolicy === NotificationEmailPolicy.REQUIRED ||
        (contract.emailPolicy === NotificationEmailPolicy.OPTIONAL &&
          (!preference ||
            preference.emailMode === NotificationEmailMode.IMMEDIATE));
      if (!createDelivery) continue;
      await manager.save(
        manager.create(NotificationDelivery, {
          companyId: recipient.companyId,
          recipientId: recipient.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.PENDING,
          attempts: 0,
          nextAttemptAt: this.clock.now(),
          lockedAt: null,
          recipientAddress: null,
          providerMessageId: null,
          lastError: null,
          sentAt: null,
          completedAt: null,
        }),
      );
    }
  }

  private async revokeIneligibleRecipients(
    manager: EntityManager,
    input: VehicleDeadlineRecipientReconciliationScope,
  ): Promise<void> {
    const params: unknown[] = [input.companyId];
    const filters = ['recipient."companyId" = $1'];
    if (input.vehicleIds?.length) {
      params.push(input.vehicleIds);
      filters.push(`detail."vehicleId" = ANY($${params.length}::uuid[])`);
    }
    if (input.userIds?.length) {
      params.push(input.userIds);
      filters.push(`EXISTS (
        SELECT 1 FROM memberships scoped_membership
        WHERE scoped_membership.id = recipient."membershipId"
          AND scoped_membership."companyId" = recipient."companyId"
          AND scoped_membership."userId" = ANY($${params.length}::uuid[])
      )`);
    }
    const recipients = await manager.query<
      Array<{
        recipientId: string;
        vehicleId: string;
        userId: string;
      }>
    >(
      `SELECT recipient.id AS "recipientId", detail."vehicleId", membership."userId"
       FROM notification_recipients recipient
       JOIN vehicle_deadline_notification_details detail
         ON detail."notificationId" = recipient."notificationId"
        AND detail."companyId" = recipient."companyId"
       JOIN memberships membership
         ON membership.id = recipient."membershipId"
        AND membership."companyId" = recipient."companyId"
       WHERE recipient."revokedAt" IS NULL
         AND ${filters.join(' AND ')}`,
      params,
    );
    if (!recipients.length) return;
    const authorized = await this.vehicleAccess.authorizedMemberships(
      manager,
      input.companyId,
      [...new Set(recipients.map(({ vehicleId }) => vehicleId))],
      input.userIds,
    );
    const authorizedPairs = new Set(
      authorized.map(({ userId, vehicleId }) => `${userId}:${vehicleId}`),
    );
    const recipientIds = recipients
      .filter(
        ({ userId, vehicleId }) =>
          !authorizedPairs.has(`${userId}:${vehicleId}`),
      )
      .map(({ recipientId }) => recipientId);
    if (!recipientIds.length) return;
    await manager.query(
      `WITH revoked AS (
         UPDATE notification_recipients recipient
            SET "revokedAt" = $2
          WHERE recipient.id = ANY($1::uuid[])
            AND recipient."revokedAt" IS NULL
          RETURNING recipient.id, recipient."companyId"
       )
       UPDATE notification_deliveries delivery
          SET status = 'CANCELLED', "completedAt" = $2, "lockedAt" = NULL
         FROM revoked
        WHERE delivery."recipientId" = revoked.id
          AND delivery."companyId" = revoked."companyId"
          AND delivery.status IN ('PENDING', 'SENDING')`,
      [recipientIds, this.clock.now()],
    );
  }
}
