import { Inject, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import {
  TRANSACTIONAL_VEHICLE_ACCESS,
  type TransactionalVehicleAccess,
} from '../fleet/transactional-vehicle-access';
import type {
  NotificationDeliveryTypeAdapter,
  NotificationDeliveryTypePreparation,
} from './notification-delivery-type-adapter';
import { NotificationType } from './notification.entity';
import { NOTIFICATION_TYPES } from './notification-types';

interface VehicleDeadlinePreparationRow {
  vehicleId: string;
  vehicleDeletedAt: Date | null;
  deadlineKind: VehicleDeadlineKind;
  deadlineDate: string;
  currentDeadlineDate: string | null;
  leadDay: number;
  registrationNumber: string;
  enabledDeadlineKinds: VehicleDeadlineKind[] | null;
  leadDays: number[] | null;
  timeZone: string | null;
}

@Injectable()
export class VehicleDeadlineDeliveryTypeAdapter implements NotificationDeliveryTypeAdapter {
  readonly type = NotificationType.VEHICLE_DEADLINE_REACHED;

  constructor(
    @Inject(TRANSACTIONAL_VEHICLE_ACCESS)
    private readonly vehicleAccess: TransactionalVehicleAccess,
    private readonly calendar: WorkspaceCalendar,
  ) {}

  async prepare(
    manager: EntityManager,
    input: {
      companyId: string;
      notificationId: string;
      membershipId: string;
      userId: string | null;
      rendererVersion: number;
      frontendBaseUrl: string;
    },
  ): Promise<NotificationDeliveryTypePreparation> {
    const row = await this.preparationRow(
      manager,
      input.companyId,
      input.notificationId,
    );
    if (!row) return { sourceValid: false, sourceAuthorized: false };

    const contract = NOTIFICATION_TYPES[this.type];
    const policyPresent =
      row.enabledDeadlineKinds !== null &&
      row.leadDays !== null &&
      row.timeZone !== null;
    const daysRemaining = policyPresent
      ? this.calendar.daysBetween(
          this.calendar.now(row.timeZone!).date,
          row.deadlineDate,
        )
      : Number.POSITIVE_INFINITY;
    const detail = contract.detailAdapter({
      vehicleId: row.vehicleId,
      deadlineKind: row.deadlineKind,
      deadlineDate: row.deadlineDate,
      leadDay: row.leadDay,
      registrationNumber: row.registrationNumber,
      currentDeadlineDate: row.currentDeadlineDate ?? '',
      enabled: row.enabledDeadlineKinds?.includes(row.deadlineKind) ?? false,
      daysRemaining,
      horizon: row.leadDays?.length
        ? Math.max(...row.leadDays)
        : Number.NEGATIVE_INFINITY,
    });
    const sourceValid =
      row.vehicleDeletedAt === null &&
      policyPresent &&
      row.enabledDeadlineKinds!.includes(row.deadlineKind) &&
      row.currentDeadlineDate === row.deadlineDate &&
      contract.validityEvaluator(detail);
    const sourceAuthorized = await this.isSourceAuthorized(manager, input, row);
    return {
      sourceValid,
      sourceAuthorized,
      rendered: sourceValid
        ? contract.emailRenderer(detail, {
            rendererVersion: input.rendererVersion,
            workspaceId: input.companyId,
            notificationId: input.notificationId,
            frontendBaseUrl: input.frontendBaseUrl,
          })
        : undefined,
    };
  }

  private async preparationRow(
    manager: EntityManager,
    companyId: string,
    notificationId: string,
  ): Promise<VehicleDeadlinePreparationRow | undefined> {
    const rows = await manager.query<VehicleDeadlinePreparationRow[]>(
      `SELECT detail."vehicleId", vehicle."deletedAt" AS "vehicleDeletedAt",
              detail."deadlineKind", to_char(detail."deadlineDate", 'YYYY-MM-DD') AS "deadlineDate",
              CASE detail."deadlineKind"
                WHEN 'OC' THEN to_char(vehicle."ocExpiry", 'YYYY-MM-DD')
                WHEN 'AC' THEN to_char(vehicle."acExpiry", 'YYYY-MM-DD')
                WHEN 'TECHNICAL_INSPECTION' THEN to_char(vehicle."technicalInspectionExpiry", 'YYYY-MM-DD')
              END AS "currentDeadlineDate",
              detail."leadDay", detail."registrationNumberSnapshot" AS "registrationNumber",
              policy."enabledDeadlineKinds", policy."leadDays", policy."timeZone"
         FROM vehicle_deadline_notification_details detail
         LEFT JOIN vehicles vehicle
           ON vehicle.id = detail."vehicleId" AND vehicle."companyId" = detail."companyId"
         LEFT JOIN vehicle_deadline_alert_policies policy
           ON policy."companyId" = detail."companyId"
        WHERE detail."companyId" = $1
          AND detail."notificationId" = $2`,
      [companyId, notificationId],
    );
    return rows[0];
  }

  private async isSourceAuthorized(
    manager: EntityManager,
    input: { companyId: string; membershipId: string; userId: string | null },
    row: VehicleDeadlinePreparationRow,
  ): Promise<boolean> {
    if (!input.userId || row.vehicleDeletedAt !== null) return false;
    const authorized = await this.vehicleAccess.authorizedMemberships(
      manager,
      input.companyId,
      [row.vehicleId],
      [input.userId],
    );
    return authorized.some(
      (candidate) => candidate.membershipId === input.membershipId,
    );
  }
}
