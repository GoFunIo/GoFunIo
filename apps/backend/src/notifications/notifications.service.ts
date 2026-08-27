import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { NotificationType } from './notification.entity';
import { NOTIFICATION_TYPES } from './notification-types';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { CLOCK, type Clock } from '../common/clock';

interface NotificationRow {
  id: string;
  type: NotificationType;
  rendererVersion: number;
  createdAt: Date;
  vehicleId: string;
  deadlineKind: VehicleDeadlineKind;
  deadlineDate: string;
  leadDay: number;
  registrationNumber: string;
  leadDays: number[];
  timeZone: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly calendar: WorkspaceCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(actor: SessionPrincipal) {
    return {
      items: (await this.vehicleDeadlineRows(actor, undefined, 20)).map((row) =>
        this.renderVehicleDeadline(row),
      ),
    };
  }

  async detail(actor: SessionPrincipal, id: string) {
    const row = (await this.vehicleDeadlineRows(actor, id, 1))[0];
    if (!row) throw new NotFoundException('Notification not found');
    return this.renderVehicleDeadline(row);
  }

  async unreadCount(actor: SessionPrincipal): Promise<number> {
    return (await this.vehicleDeadlineRows(actor, undefined, undefined, true))
      .length;
  }

  private async vehicleDeadlineRows(
    actor: SessionPrincipal,
    id?: string,
    limit?: number,
    unreadOnly = false,
  ): Promise<NotificationRow[]> {
    const companyId = requireCompanyId(actor);
    const isAdmin =
      actor.role === MembershipRole.OWNER ||
      actor.role === MembershipRole.ADMIN;
    const rows = await this.dataSource.query<NotificationRow[]>(
      `SELECT n.id, n.type, n."rendererVersion", n."createdAt",
              d."vehicleId", d."deadlineKind", to_char(d."deadlineDate", 'YYYY-MM-DD') AS "deadlineDate", d."leadDay",
              d."registrationNumberSnapshot" AS "registrationNumber",
              p."leadDays", p."timeZone"
       FROM notifications n
       JOIN vehicle_deadline_notification_details d
         ON d."notificationId" = n.id AND d."companyId" = n."companyId"
       JOIN notification_recipients r
         ON r."notificationId" = n.id AND r."companyId" = n."companyId" AND r."revokedAt" IS NULL
       JOIN memberships m
         ON m.id = r."membershipId" AND m."companyId" = r."companyId"
        AND m."userId" = $2 AND m.status = 'active'
       JOIN vehicles v ON v.id = d."vehicleId" AND v."companyId" = d."companyId" AND v."deletedAt" IS NULL
       JOIN vehicle_deadline_alert_policies p ON p."companyId" = n."companyId"
       WHERE n."companyId" = $1
         AND n.type = 'VEHICLE_DEADLINE_REACHED'
         AND n."invalidatedAt" IS NULL
         AND (n."expiresAt" IS NULL OR n."expiresAt" > $6)
         AND d."deadlineKind" = ANY(p."enabledDeadlineKinds")
         AND CASE d."deadlineKind"
           WHEN 'OC' THEN v."ocExpiry" = d."deadlineDate"
           WHEN 'AC' THEN v."acExpiry" = d."deadlineDate"
           WHEN 'TECHNICAL_INSPECTION' THEN v."technicalInspectionExpiry" = d."deadlineDate"
         END
         AND ($3::boolean OR EXISTS (
           SELECT 1 FROM manager_vehicle_assignments a
           WHERE a."companyId" = n."companyId" AND a."vehicleId" = d."vehicleId"
             AND a."managerId" = $2 AND a."assignedTo" IS NULL
         ))
         AND ($4::uuid IS NULL OR n.id = $4)
         AND ($5::boolean = false OR (r."readAt" IS NULL AND r."archivedAt" IS NULL))
       ORDER BY n."createdAt" DESC, n.id DESC`,
      [companyId, actor.id, isAdmin, id ?? null, unreadOnly, this.clock.now()],
    );
    const valid = rows.filter((row) => {
      const today = this.calendar.now(row.timeZone).date;
      return (
        this.calendar.daysBetween(today, row.deadlineDate) <=
        Math.max(...row.leadDays)
      );
    });
    return limit === undefined ? valid : valid.slice(0, limit);
  }

  private renderVehicleDeadline(row: NotificationRow) {
    const contract = NOTIFICATION_TYPES[row.type];
    const detail = contract.detailAdapter({
      vehicleId: row.vehicleId,
      deadlineKind: row.deadlineKind,
      deadlineDate: row.deadlineDate,
      leadDay: row.leadDay,
      registrationNumber: row.registrationNumber,
      currentDeadlineDate: row.deadlineDate,
      enabled: true,
      daysRemaining: this.calendar.daysBetween(
        this.calendar.now(row.timeZone).date,
        row.deadlineDate,
      ),
      horizon: Math.max(...row.leadDays),
    });
    if (!contract.validityEvaluator(detail)) {
      throw new NotFoundException('Notification not found');
    }
    const rendered = contract.dtoRenderer(detail);
    return {
      id: row.id,
      type: row.type,
      category: contract.category,
      rendererVersion: row.rendererVersion,
      createdAt: row.createdAt,
      ...rendered,
      action: { type: 'OPEN_VEHICLE' as const, vehicleId: row.vehicleId },
    };
  }
}
