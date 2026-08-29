import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  VehicleDeadlineAlertPolicy,
  VehicleDeadlineKind,
} from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { CLOCK, type Clock } from '../common/clock';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import type { FleetVehicle } from '../fleet/fleet-unit-of-work';
import { Notification, NotificationType } from './notification.entity';
import { NOTIFICATION_TYPES } from './notification-types';
import { VehicleDeadlineNotificationDetail } from './vehicle-deadline-notification-detail.entity';
import { VehicleDeadlineRecipientReconciler } from './vehicle-deadline-recipient-reconciler';
import { selectVehicleDeadlineStage } from './vehicle-deadline-stage';
import {
  vehicleDeadlineDate,
  vehicleDeadlineTriggerKey,
} from './vehicle-deadline-trigger';
import { NotificationChangeRelay } from '../notification-changes/notification-change-relay';
import { recordNotificationOperationalEvent } from '../notification-changes/notification-transaction-observer';

@Injectable()
export class VehicleDeadlineNotificationWriter {
  constructor(
    private readonly calendar: WorkspaceCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly recipients: VehicleDeadlineRecipientReconciler,
    private readonly notificationChanges: NotificationChangeRelay,
  ) {}

  async persist(
    manager: EntityManager,
    vehicle: FleetVehicle,
    changedKinds: VehicleDeadlineKind[],
    scheduled?: {
      policy: VehicleDeadlineAlertPolicy;
      enforceActivationBoundary: true;
    },
  ): Promise<void> {
    if (!changedKinds.length) return;
    const policy =
      scheduled?.policy ??
      (await manager.findOneBy(VehicleDeadlineAlertPolicy, {
        companyId: vehicle.companyId,
      }));
    if (!policy) return;
    const now = this.calendar.now(policy.timeZone);
    if (policy.activatedAt > this.clock.now()) return;

    for (const deadlineKind of changedKinds) {
      if (!policy.enabledDeadlineKinds.includes(deadlineKind)) continue;
      const deadlineDate = vehicleDeadlineDate(vehicle, deadlineKind);
      if (!deadlineDate) continue;
      const leadDay = selectVehicleDeadlineStage({
        deadlineDate,
        leadDays: policy.leadDays,
        localNow: now,
        activatedLocal: scheduled?.enforceActivationBoundary
          ? this.calendar.localIso(policy.activatedAt, policy.timeZone)
          : '0000-01-01T00:00:00.000',
      });
      if (leadDay === undefined) continue;

      const trigger = vehicleDeadlineTriggerKey({
        companyId: vehicle.companyId,
        vehicleId: vehicle.id,
        deadlineKind,
        deadlineDate,
        leadDay,
      });
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
      if (existing) {
        recordNotificationOperationalEvent(manager, {
          event: 'notification_deduplicated',
          notificationType: NotificationType.VEHICLE_DEADLINE_REACHED,
        });
        continue;
      }

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
      await this.recipients.addRecipientsForNotifications(manager, [
        notification.id,
      ]);
      await this.notificationChanges.record(manager, {
        companyId: vehicle.companyId,
        userId: null,
      });
      recordNotificationOperationalEvent(manager, {
        event: 'notification_generated',
        notificationId: notification.id,
        notificationType: notification.type,
      });
    }
  }
}
