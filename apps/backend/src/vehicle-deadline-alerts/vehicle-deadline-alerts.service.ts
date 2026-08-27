import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import {
  VehicleDeadlineKind,
  VehicleDeadlineAlertPolicy,
} from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { WorkspaceCalendar } from '../common/workspace-calendar';
import type { EnvVars } from '../config/env.validation';
import { VEHICLE_ACCESS, type VehicleAccess } from '../fleet/vehicle-access';
import type { SessionPrincipal } from '../users/session-principal';
import { requireCompanyId } from '../users/session-principal';
import { ListVehicleDeadlineAlertsQueryDto } from './dtos/list-vehicle-deadline-alerts-query.dto';

interface AlertCursor {
  version: 1;
  companyId: string;
  deadlineDate: string;
  vehicleId: string;
  deadlineKind: VehicleDeadlineKind;
  filters: string;
}

interface AlertProjection {
  alertKey: string;
  vehicleId: string;
  vehicle: { brand: string; model: string; registrationNumber: string };
  deadlineKind: VehicleDeadlineKind;
  deadlineDate: string;
  daysRemaining: number;
  overdue: boolean;
}

type AlertPosition = Pick<
  AlertProjection,
  'deadlineDate' | 'vehicleId' | 'deadlineKind'
>;

const deadlineFields: Record<
  VehicleDeadlineKind,
  'ocExpiry' | 'acExpiry' | 'technicalInspectionExpiry'
> = {
  [VehicleDeadlineKind.OC]: 'ocExpiry',
  [VehicleDeadlineKind.AC]: 'acExpiry',
  [VehicleDeadlineKind.TECHNICAL_INSPECTION]: 'technicalInspectionExpiry',
};

@Injectable()
export class VehicleDeadlineAlertsService {
  private readonly signingKey: string;

  constructor(
    @Inject(VEHICLE_ACCESS) private readonly vehicleAccess: VehicleAccess,
    @InjectRepository(VehicleDeadlineAlertPolicy)
    private readonly policies: Repository<VehicleDeadlineAlertPolicy>,
    private readonly calendar: WorkspaceCalendar,
    private readonly config: ConfigService<EnvVars, true>,
  ) {
    this.signingKey = this.config.get('COOKIE_KEY');
  }

  async list(
    actor: SessionPrincipal,
    query: ListVehicleDeadlineAlertsQueryDto,
  ) {
    const alerts = await this.project(actor);
    const filtered = alerts.filter(
      (alert) =>
        (!query.deadlineKind || alert.deadlineKind === query.deadlineKind) &&
        (!query.vehicleId || alert.vehicleId === query.vehicleId) &&
        (query.overdue === undefined || alert.overdue === query.overdue),
    );
    const companyId = requireCompanyId(actor);
    const filters = this.filterIdentity(query);
    const cursor = query.cursor
      ? this.decodeCursor(query.cursor, companyId, filters)
      : null;
    const afterCursor = cursor
      ? filtered.filter((alert) => this.comparePosition(alert, cursor) > 0)
      : filtered;
    const page = afterCursor.slice(0, query.limit);
    const hasNextPage = afterCursor.length > query.limit;

    return {
      items: page,
      nextCursor: hasNextPage
        ? this.encodeCursor(page[page.length - 1], companyId, filters)
        : null,
    };
  }

  async summary(actor: SessionPrincipal) {
    return {
      activeAlertCount: (await this.project(actor)).length,
      unreadNotificationCount: 0,
    };
  }

  private async project(actor: SessionPrincipal): Promise<AlertProjection[]> {
    const companyId = requireCompanyId(actor);
    const [vehicles, policy] = await Promise.all([
      this.vehicleAccess.visible(actor),
      this.vehicleAccessPolicy(companyId),
    ]);
    const today = this.calendar.now(policy.timeZone).date;
    const horizon = Math.max(...policy.leadDays);
    const alerts: AlertProjection[] = [];

    for (const vehicle of vehicles) {
      for (const deadlineKind of policy.enabledDeadlineKinds) {
        const deadlineDate = vehicle[deadlineFields[deadlineKind]];
        if (!deadlineDate) continue;
        const daysRemaining = this.calendar.daysBetween(today, deadlineDate);
        if (daysRemaining > horizon) continue;
        alerts.push({
          alertKey: this.alertKey(
            companyId,
            vehicle.id,
            deadlineKind,
            deadlineDate,
          ),
          vehicleId: vehicle.id,
          vehicle: {
            brand: vehicle.brand,
            model: vehicle.model,
            registrationNumber: vehicle.registrationNumber,
          },
          deadlineKind,
          deadlineDate,
          daysRemaining,
          overdue: daysRemaining < 0,
        });
      }
    }

    return alerts.sort((left, right) => this.comparePosition(left, right));
  }

  private async vehicleAccessPolicy(
    companyId: string,
  ): Promise<VehicleDeadlineAlertPolicy> {
    const policy = await this.policies.findOneBy({ companyId });
    if (!policy) throw new BadRequestException('Alert policy not configured');
    return policy;
  }

  private alertKey(
    companyId: string,
    vehicleId: string,
    kind: VehicleDeadlineKind,
    date: string,
  ): string {
    return createHash('sha256')
      .update(`alert\0${companyId}\0${vehicleId}\0${kind}\0${date}`)
      .digest('base64url');
  }

  private filterIdentity(query: ListVehicleDeadlineAlertsQueryDto): string {
    return this.mac(
      JSON.stringify({
        deadlineKind: query.deadlineKind ?? null,
        vehicleId: query.vehicleId ?? null,
        overdue: query.overdue ?? null,
      }),
    );
  }

  private encodeCursor(
    alert: AlertProjection,
    companyId: string,
    filters: string,
  ): string {
    const payload = Buffer.from(
      JSON.stringify({
        version: 1,
        companyId,
        deadlineDate: alert.deadlineDate,
        vehicleId: alert.vehicleId,
        deadlineKind: alert.deadlineKind,
        filters,
      } satisfies AlertCursor),
    ).toString('base64url');
    return `${payload}.${this.mac(payload)}`;
  }

  private decodeCursor(
    value: string,
    companyId: string,
    filters: string,
  ): AlertCursor {
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
      ) as Partial<AlertCursor>;
      if (
        cursor.version !== 1 ||
        cursor.companyId !== companyId ||
        typeof cursor.deadlineDate !== 'string' ||
        typeof cursor.vehicleId !== 'string' ||
        !Object.values(VehicleDeadlineKind).includes(
          cursor.deadlineKind as VehicleDeadlineKind,
        ) ||
        cursor.filters !== filters
      ) {
        throw new Error();
      }
      return cursor as AlertCursor;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private comparePosition(left: AlertPosition, right: AlertPosition): number {
    return (
      left.deadlineDate.localeCompare(right.deadlineDate) ||
      left.vehicleId.localeCompare(right.vehicleId) ||
      left.deadlineKind.localeCompare(right.deadlineKind)
    );
  }

  private mac(value: string): string {
    return createHmac('sha256', this.signingKey)
      .update(value)
      .digest('base64url');
  }
}
