import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  VehicleDeadlineAlertPolicy,
  VehicleDeadlineKind,
} from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { CLOCK, type Clock } from '../common/clock';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import type { FleetVehicle } from '../fleet/fleet-unit-of-work';
import {
  NotificationEmailMode,
  NotificationPreference,
} from '../notification-preferences/notification-preference.entity';
import { Membership } from '../users/membership.entity';
import { MembershipRole } from '../users/membership-role';
import {
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryStatus,
} from './notification-delivery.entity';
import { NotificationRecipient } from './notification-recipient.entity';
import { Notification, NotificationType } from './notification.entity';
import {
  NOTIFICATION_TYPES,
  NotificationEmailPolicy,
} from './notification-types';
import { VehicleDeadlineNotificationDetail } from './vehicle-deadline-notification-detail.entity';

const deadlineFields: Record<
  VehicleDeadlineKind,
  keyof Pick<
    FleetVehicle,
    'ocExpiry' | 'acExpiry' | 'technicalInspectionExpiry'
  >
> = {
  [VehicleDeadlineKind.OC]: 'ocExpiry',
  [VehicleDeadlineKind.AC]: 'acExpiry',
  [VehicleDeadlineKind.TECHNICAL_INSPECTION]: 'technicalInspectionExpiry',
};

@Injectable()
export class VehicleDeadlineNotificationWriter {
  constructor(
    private readonly calendar: WorkspaceCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async persist(
    manager: EntityManager,
    vehicle: FleetVehicle,
    changedKinds: VehicleDeadlineKind[],
  ): Promise<void> {
    if (!changedKinds.length) return;
    const policy = await manager.findOneBy(VehicleDeadlineAlertPolicy, {
      companyId: vehicle.companyId,
    });
    if (!policy || !this.calendar.isAtOrAfterHour(policy.timeZone, 8)) return;
    const now = this.calendar.now(policy.timeZone);
    if (policy.activatedAt > this.clock.now()) return;

    for (const deadlineKind of changedKinds) {
      if (!policy.enabledDeadlineKinds.includes(deadlineKind)) continue;
      const deadlineDate = vehicle[deadlineFields[deadlineKind]];
      if (!deadlineDate) continue;
      const daysRemaining = this.calendar.daysBetween(now.date, deadlineDate);
      const leadDay = [...policy.leadDays]
        .sort((a, b) => a - b)
        .find((candidate) => daysRemaining <= candidate);
      if (leadDay === undefined || (leadDay === 0 && daysRemaining < -7))
        continue;

      const trigger = `${vehicle.companyId}:${vehicle.id}:${deadlineKind}:${deadlineDate}:${leadDay}`;
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [trigger],
      );
      const existing = await manager.findOneBy(
        VehicleDeadlineNotificationDetail,
        {
          companyId: vehicle.companyId,
          vehicleId: vehicle.id,
          deadlineKind,
          deadlineDate,
          leadDay,
        },
      );
      if (existing) continue;

      const contract =
        NOTIFICATION_TYPES[NotificationType.VEHICLE_DEADLINE_REACHED];
      const notification = await manager.save(
        manager.create(Notification, {
          companyId: vehicle.companyId,
          type: NotificationType.VEHICLE_DEADLINE_REACHED,
          category: contract.category,
          rendererVersion: contract.rendererVersion,
          occurredAt: this.clock.now(),
          expiresAt: null,
          invalidatedAt: null,
        }),
      );
      await manager.save(
        manager.create(VehicleDeadlineNotificationDetail, {
          notificationId: notification.id,
          companyId: vehicle.companyId,
          vehicleId: vehicle.id,
          deadlineKind,
          deadlineDate,
          leadDay,
          registrationNumberSnapshot: vehicle.registrationNumber,
        }),
      );
      const memberships = await manager
        .createQueryBuilder(Membership, 'membership')
        .where('membership.companyId = :companyId', {
          companyId: vehicle.companyId,
        })
        .andWhere("membership.status = 'active'")
        .andWhere(
          `(membership.role IN (:...admins) OR (membership.role = :managerRole AND EXISTS (
          SELECT 1 FROM manager_vehicle_assignments assignment
          WHERE assignment."companyId" = membership."companyId"
            AND assignment."managerId" = membership."userId"
            AND assignment."vehicleId" = :vehicleId AND assignment."assignedTo" IS NULL)))`,
          {
            admins: [MembershipRole.OWNER, MembershipRole.ADMIN],
            managerRole: MembershipRole.MANAGER,
            vehicleId: vehicle.id,
          },
        )
        .getMany();
      for (const membership of memberships) {
        const recipient = await manager.save(
          manager.create(NotificationRecipient, {
            companyId: vehicle.companyId,
            notificationId: notification.id,
            membershipId: membership.id,
            readAt: null,
            archivedAt: null,
            revokedAt: null,
          }),
        );
        const preference = await manager.findOneBy(NotificationPreference, {
          companyId: vehicle.companyId,
          membershipId: membership.id,
          category: contract.category,
        });
        const createDelivery =
          contract.emailPolicy === NotificationEmailPolicy.REQUIRED ||
          (contract.emailPolicy === NotificationEmailPolicy.OPTIONAL &&
            (!preference ||
              preference.emailMode === NotificationEmailMode.IMMEDIATE));
        if (createDelivery) {
          await manager.save(
            manager.create(NotificationDelivery, {
              companyId: vehicle.companyId,
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
    }
  }
}
