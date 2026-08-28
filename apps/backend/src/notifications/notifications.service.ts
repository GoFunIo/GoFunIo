import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
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
import { ListNotificationsQueryDto } from './dtos/list-notifications-query.dto';
import { NotificationCategory } from '../notification-preferences/notification-preference.entity';
import type { EnvVars } from '../config/env.validation';
import { NotificationChangeRelay } from '../notification-changes/notification-change-relay';

interface NotificationCursor {
  version: 1;
  companyId: string;
  userId: string;
  createdAt: string;
  id: string;
  filters: string;
}

interface NotificationRowQuery {
  id?: string;
  category?: NotificationCategory;
  unread?: boolean;
  archived?: boolean;
  cursor?: Pick<NotificationCursor, 'createdAt' | 'id'>;
  lockAuthorization?: boolean;
}

interface NotificationRow {
  id: string;
  type: NotificationType;
  rendererVersion: number;
  createdAt: Date;
  cursorCreatedAt: string;
  recipientId: string;
  readAt: Date | null;
  archivedAt: Date | null;
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
  private readonly signingKey: string;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly calendar: WorkspaceCalendar,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(TRANSACTIONAL_VEHICLE_ACCESS)
    private readonly vehicleAccess: TransactionalVehicleAccess,
    config: ConfigService<EnvVars, true>,
    private readonly notificationChanges: NotificationChangeRelay,
  ) {
    this.signingKey = config.get('COOKIE_KEY');
  }

  async list(actor: SessionPrincipal, query: ListNotificationsQueryDto) {
    const companyId = requireCompanyId(actor);
    const filters = this.filterIdentity(query);
    const cursor = query.cursor
      ? this.decodeCursor(query.cursor, actor, filters)
      : undefined;
    const rows = await this.vehicleDeadlineRows(actor, {
      category: query.category,
      unread: query.unread,
      archived: query.archived,
      cursor,
    });
    const page = rows.slice(0, query.limit);
    return {
      items: page.map((row) => this.renderVehicleDeadline(row)),
      nextCursor:
        rows.length > query.limit
          ? this.encodeCursor(
              page[page.length - 1],
              companyId,
              actor.id,
              filters,
            )
          : null,
    };
  }

  async detail(actor: SessionPrincipal, id: string) {
    const row = (await this.vehicleDeadlineRows(actor, { id }))[0];
    if (!row) throw new NotFoundException('Notification not found');
    return this.renderVehicleDeadline(row);
  }

  async unreadCount(actor: SessionPrincipal): Promise<number> {
    return (
      await this.vehicleDeadlineRows(actor, {
        unread: true,
        archived: false,
      })
    ).length;
  }

  markRead(actor: SessionPrincipal, id: string) {
    return this.withLockedPersonalState(actor, id, async (manager, row) => {
      await manager.query(
        `UPDATE notification_recipients
            SET "readAt" = COALESCE("readAt", $2)
          WHERE id = $1`,
        [row.recipientId, this.clock.now()],
      );
    });
  }

  archive(actor: SessionPrincipal, id: string) {
    return this.withLockedPersonalState(actor, id, async (manager, row) => {
      await manager.query(
        `UPDATE notification_recipients
            SET "readAt" = COALESCE("readAt", $2),
                "archivedAt" = COALESCE("archivedAt", $2)
          WHERE id = $1`,
        [row.recipientId, this.clock.now()],
      );
    });
  }

  readAll(actor: SessionPrincipal, category?: NotificationCategory) {
    return this.dataSource.transaction(async (manager) => {
      const rows = await this.lockedVehicleDeadlineRows(
        actor,
        { category, unread: true, archived: false },
        manager,
      );
      if (!rows.length) return { updatedCount: 0 };
      const [result] = await manager.query<Array<{ updatedCount: number }>>(
        `WITH updated AS (
           UPDATE notification_recipients
              SET "readAt" = $2
            WHERE id = ANY($1::uuid[])
              AND "readAt" IS NULL
              AND "archivedAt" IS NULL
              AND "revokedAt" IS NULL
            RETURNING 1
         )
         SELECT count(*)::int AS "updatedCount" FROM updated`,
        [rows.map(({ recipientId }) => recipientId), this.clock.now()],
      );
      if (result.updatedCount > 0) {
        await this.notificationChanges.record(manager, {
          companyId: requireCompanyId(actor),
          userId: actor.id,
        });
      }
      return result;
    });
  }

  private async vehicleDeadlineRows(
    actor: SessionPrincipal,
    query: NotificationRowQuery,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<NotificationRow[]> {
    const companyId = requireCompanyId(actor);
    const rows = await manager.query<NotificationRow[]>(
      `SELECT notification.id, notification.type, notification."rendererVersion", notification."createdAt",
              to_char(notification."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorCreatedAt",
              recipient.id AS "recipientId", recipient."readAt", recipient."archivedAt",
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
         AND (notification."expiresAt" IS NULL OR notification."expiresAt" > $3)
         AND ($4::uuid IS NULL OR notification.id = $4)
         AND ($5::notification_category IS NULL OR notification.category = $5)
         AND ($6::boolean IS NULL OR ($6 = (recipient."readAt" IS NULL)))
         AND ($7::boolean IS NULL OR ($7 = (recipient."archivedAt" IS NOT NULL)))
         AND ($8::timestamptz IS NULL OR (notification."createdAt", notification.id) < ($8, $9::uuid))
       ORDER BY notification."createdAt" DESC, notification.id DESC
       ${query.lockAuthorization ? 'FOR SHARE OF vehicle, membership, policy' : ''}`,
      [
        companyId,
        actor.id,
        this.clock.now(),
        query.id ?? null,
        query.category ?? null,
        query.unread ?? null,
        query.archived ?? null,
        query.cursor?.createdAt ?? null,
        query.cursor?.id ?? null,
      ],
    );
    const authorized = await this.vehicleAccess.authorizedMemberships(
      manager,
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
    return valid;
  }

  private async lockedVehicleDeadlineRows(
    actor: SessionPrincipal,
    query: NotificationRowQuery,
    manager: EntityManager,
  ): Promise<NotificationRow[]> {
    const candidates = await this.vehicleDeadlineRows(
      actor,
      { ...query, lockAuthorization: true },
      manager,
    );
    if (!candidates.length) return [];
    const locked = await manager.query<Array<{ recipientId: string }>>(
      `SELECT recipient.id AS "recipientId"
         FROM notification_recipients recipient
         JOIN notifications notification
           ON notification.id = recipient."notificationId"
          AND notification."companyId" = recipient."companyId"
        WHERE recipient."companyId" = $1
          AND recipient.id = ANY($2::uuid[])
          AND recipient."revokedAt" IS NULL
          AND notification."invalidatedAt" IS NULL
        FOR SHARE OF notification
        FOR UPDATE OF recipient`,
      [
        requireCompanyId(actor),
        candidates.map(({ recipientId }) => recipientId),
      ],
    );
    const lockedRecipientIds = new Set(
      locked.map(({ recipientId }) => recipientId),
    );
    if (!lockedRecipientIds.size) return [];
    const current = await this.vehicleDeadlineRows(actor, query, manager);
    return current.filter(({ recipientId }) =>
      lockedRecipientIds.has(recipientId),
    );
  }

  private withLockedPersonalState(
    actor: SessionPrincipal,
    id: string,
    update: (manager: EntityManager, row: NotificationRow) => Promise<void>,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const row = (
        await this.lockedVehicleDeadlineRows(actor, { id }, manager)
      )[0];
      if (!row) throw new NotFoundException('Notification not found');
      await update(manager, row);
      await this.notificationChanges.record(manager, {
        companyId: requireCompanyId(actor),
        userId: actor.id,
      });
      const updated = (
        await this.vehicleDeadlineRows(actor, { id }, manager)
      )[0];
      return this.renderVehicleDeadline(updated);
    });
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
      readAt: row.readAt,
      archivedAt: row.archivedAt,
      ...rendered,
      action: { type: 'OPEN_VEHICLE' as const, vehicleId: row.vehicleId },
    };
  }

  private filterIdentity(query: ListNotificationsQueryDto): string {
    return this.mac(
      JSON.stringify({
        category: query.category ?? null,
        unread: query.unread ?? null,
        archived: query.archived,
      }),
    );
  }

  private encodeCursor(
    row: NotificationRow,
    companyId: string,
    userId: string,
    filters: string,
  ): string {
    const payload = Buffer.from(
      JSON.stringify({
        version: 1,
        companyId,
        userId,
        createdAt: row.cursorCreatedAt,
        id: row.id,
        filters,
      } satisfies NotificationCursor),
    ).toString('base64url');
    return `${payload}.${this.mac(payload)}`;
  }

  private decodeCursor(
    value: string,
    actor: SessionPrincipal,
    filters: string,
  ): NotificationCursor {
    try {
      const [payload, signature, extra] = value.split('.');
      if (!payload || !signature || extra) throw new Error();
      const expected = Buffer.from(this.mac(payload));
      const supplied = Buffer.from(signature);
      if (
        expected.length !== supplied.length ||
        !timingSafeEqual(expected, supplied)
      ) {
        throw new Error();
      }
      const cursor = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Partial<NotificationCursor>;
      const cursorTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
      if (
        cursor.version !== 1 ||
        cursor.companyId !== requireCompanyId(actor) ||
        cursor.userId !== actor.id ||
        typeof cursor.createdAt !== 'string' ||
        !cursorTimestamp.test(cursor.createdAt) ||
        Number.isNaN(Date.parse(cursor.createdAt)) ||
        typeof cursor.id !== 'string' ||
        cursor.filters !== filters
      ) {
        throw new Error();
      }
      return cursor as NotificationCursor;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private mac(value: string): string {
    return createHmac('sha256', this.signingKey)
      .update(value)
      .digest('base64url');
  }
}
