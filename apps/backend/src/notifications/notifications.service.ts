import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { NotificationType } from './notification.entity';
import { NOTIFICATION_TYPES } from './notification-types';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { CLOCK, type Clock } from '../common/clock';
import {
  TRANSACTIONAL_VEHICLE_ACCESS,
  type TransactionalVehicleAccess,
} from '../fleet/transactional-vehicle-access';
import {
  VEHICLE_DEADLINE_SOURCE_VALIDITY_JOINS,
  VEHICLE_DEADLINE_SOURCE_VALIDITY_PREDICATE,
} from './vehicle-deadline-source-validity';

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
    @Inject(TRANSACTIONAL_VEHICLE_ACCESS)
    private readonly vehicleAccess: TransactionalVehicleAccess,
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
    const rows = await this.dataSource.query<NotificationRow[]>(
      `SELECT notification.id, notification.type, notification."rendererVersion", notification."createdAt",
              detail."vehicleId", detail."deadlineKind", to_char(detail."deadlineDate", 'YYYY-MM-DD') AS "deadlineDate", detail."leadDay",
              detail."registrationNumberSnapshot" AS "registrationNumber",
              policy."leadDays", policy."timeZone"
       FROM notifications notification
       JOIN vehicle_deadline_notification_details detail
         ON detail."notificationId" = notification.id AND detail."companyId" = notification."companyId"
       JOIN notification_recipients recipient
         ON recipient."notificationId" = notification.id AND recipient."companyId" = notification."companyId" AND recipient."revokedAt" IS NULL
       JOIN memberships membership
         ON membership.id = recipient."membershipId" AND membership."companyId" = recipient."companyId"
        AND membership."userId" = $2 AND membership.status = 'active'
       ${VEHICLE_DEADLINE_SOURCE_VALIDITY_JOINS}
       WHERE notification."companyId" = $1
         AND notification.type = 'VEHICLE_DEADLINE_REACHED'
         AND ${VEHICLE_DEADLINE_SOURCE_VALIDITY_PREDICATE}
         AND (notification."expiresAt" IS NULL OR notification."expiresAt" > $5)
         AND ($3::uuid IS NULL OR notification.id = $3)
         AND ($4::boolean = false OR (recipient."readAt" IS NULL AND recipient."archivedAt" IS NULL))
       ORDER BY notification."createdAt" DESC, notification.id DESC`,
      [companyId, actor.id, id ?? null, unreadOnly, this.clock.now()],
    );
    const authorized = await this.vehicleAccess.authorizedMemberships(
      this.dataSource.manager,
      companyId,
      [...new Set(rows.map(({ vehicleId }) => vehicleId))],
      [actor.id],
    );
    const authorizedVehicles = new Set(
      authorized.map(({ vehicleId }) => vehicleId),
    );
    const valid = rows.filter((row) => {
      const today = this.calendar.now(row.timeZone).date;
      return (
        authorizedVehicles.has(row.vehicleId) &&
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
