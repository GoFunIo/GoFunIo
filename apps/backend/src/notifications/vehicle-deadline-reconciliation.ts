import {
  Injectable,
  Inject,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { VehicleDeadlineAlertPolicy } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { CLOCK, type Clock } from '../common/clock';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import { EnvVars, NodeEnv } from '../config/env.validation';
import { Vehicle } from '../vehicles/vehicles.entity';
import { VehicleDeadlineNotificationWriter } from './vehicle-deadline-notification-writer';
import { VehicleDeadlineRecipientReconciler } from './vehicle-deadline-recipient-reconciler';
import { VehicleDeadlineNotificationDetail } from './vehicle-deadline-notification-detail.entity';
import { selectVehicleDeadlineStage } from './vehicle-deadline-stage';
import {
  VEHICLE_DEADLINE_FIELDS,
  vehicleDeadlineDate,
  vehicleDeadlineTriggerKey,
} from './vehicle-deadline-trigger';
import { NOTIFICATION_DELIVERY_COMMITTED } from './notification-delivery-events';

const SCHEDULE_MS = 15 * 60 * 1000;
const INVALID_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const SOURCE_DATE_INVALIDITY_SQL = Object.entries(VEHICLE_DEADLINE_FIELDS)
  .map(
    ([kind, field]) =>
      `WHEN '${kind}' THEN v."${field}" IS DISTINCT FROM d."deadlineDate"`,
  )
  .join('\n');

@Injectable()
export class VehicleDeadlineReconciliationStore {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly writer: VehicleDeadlineNotificationWriter,
    private readonly recipients: VehicleDeadlineRecipientReconciler,
    private readonly calendar: WorkspaceCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async run(): Promise<void> {
    const now = this.clock.now();
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `WITH invalid AS (
           UPDATE notifications n SET "invalidatedAt" = $1
           FROM vehicle_deadline_notification_details d
           LEFT JOIN vehicles v ON v.id = d."vehicleId" AND v."companyId" = d."companyId"
           LEFT JOIN vehicle_deadline_alert_policies p ON p."companyId" = d."companyId"
           WHERE n.id = d."notificationId" AND n."companyId" = d."companyId"
             AND n."invalidatedAt" IS NULL
             AND (v.id IS NULL OR v."deletedAt" IS NOT NULL OR p."companyId" IS NULL
               OR NOT (d."deadlineKind" = ANY(p."enabledDeadlineKinds"))
               OR CASE d."deadlineKind" ${SOURCE_DATE_INVALIDITY_SQL} END)
           RETURNING n.id, n."companyId"
         )
         UPDATE notification_deliveries delivery
            SET status = 'CANCELLED', "completedAt" = $1, "lockedAt" = NULL
         FROM notification_recipients recipient, invalid
         WHERE recipient.id = delivery."recipientId"
           AND recipient."companyId" = delivery."companyId"
           AND recipient."notificationId" = invalid.id
           AND recipient."companyId" = invalid."companyId"
           AND delivery.status IN ('PENDING', 'SENDING')`,
        [now],
      );

      await manager.query(
        `DELETE FROM notifications
         WHERE "invalidatedAt" IS NOT NULL AND "invalidatedAt" < $1
           AND EXISTS (SELECT 1 FROM vehicle_deadline_notification_details detail
                       WHERE detail."notificationId" = notifications.id
                         AND detail."companyId" = notifications."companyId")`,
        [new Date(now.getTime() - INVALID_RETENTION_MS)],
      );

      const policies = await manager.find(VehicleDeadlineAlertPolicy);
      const vehicles = await manager.find(Vehicle, {
        where: { deletedAt: IsNull() },
        order: { companyId: 'ASC', id: 'ASC' },
      });
      const existingDetails = await manager.find(
        VehicleDeadlineNotificationDetail,
      );
      const existingTriggers = new Set(
        existingDetails.map((detail) => vehicleDeadlineTriggerKey(detail)),
      );
      const byCompany = new Map(
        policies.map((policy) => [policy.companyId, policy]),
      );
      for (const vehicle of vehicles) {
        const policy = byCompany.get(vehicle.companyId);
        if (!policy) continue;
        const localNow = this.calendar.now(policy.timeZone);
        const activatedLocal = this.calendar.localIso(
          policy.activatedAt,
          policy.timeZone,
        );
        const missingKinds = policy.enabledDeadlineKinds.filter((kind) => {
          const deadlineDate = vehicleDeadlineDate(vehicle, kind);
          if (!deadlineDate) return false;
          const leadDay = selectVehicleDeadlineStage({
            deadlineDate,
            leadDays: policy.leadDays,
            localNow,
            activatedLocal,
          });
          return (
            leadDay !== undefined &&
            !existingTriggers.has(
              vehicleDeadlineTriggerKey({
                companyId: vehicle.companyId,
                vehicleId: vehicle.id,
                deadlineKind: kind,
                deadlineDate,
                leadDay,
              }),
            )
          );
        });
        if (!missingKinds.length) continue;
        await this.writer.persist(manager, vehicle, missingKinds, {
          policy,
          enforceActivationBoundary: true,
        });
      }
      for (const policy of policies) {
        await this.recipients.reconcileRecipients(manager, {
          companyId: policy.companyId,
        });
      }
    });
    this.events.emit(NOTIFICATION_DELIVERY_COMMITTED);
  }
}

@Injectable()
export class VehicleDeadlineReconciliation
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(VehicleDeadlineReconciliation.name);
  private active?: Promise<void>;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly store: VehicleDeadlineReconciliationStore,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get('NODE_ENV') === NodeEnv.Test) return;
    await this.runScheduledCycle();
    this.timer = setInterval(() => void this.runScheduledCycle(), SCHEDULE_MS);
    this.timer.unref();
  }

  processDue(): Promise<void> {
    if (this.active) return this.active;
    const active = this.store.run().finally(() => {
      if (this.active === active) this.active = undefined;
    });
    this.active = active;
    return active;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.active?.catch((error) => this.logCycleFailure(error));
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
        event: 'vehicle_deadline_reconciliation_cycle_failed',
        errorType: errorType(error),
      }),
    );
  }
}

function errorType(error: unknown): string {
  return error instanceof Error ? error.constructor.name : 'UnknownError';
}
