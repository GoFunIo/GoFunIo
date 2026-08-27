import type { EntityManager } from 'typeorm';
import {
  DEFAULT_VEHICLE_DEADLINE_KINDS,
  DEFAULT_VEHICLE_DEADLINE_LEAD_DAYS,
  DEFAULT_VEHICLE_DEADLINE_TIME_ZONE,
  VehicleDeadlineAlertPolicy,
} from './vehicle-deadline-alert-policy.entity';

export function provisionVehicleDeadlineAlertPolicy(
  manager: EntityManager,
  companyId: string,
  activatedAt: Date,
): Promise<VehicleDeadlineAlertPolicy> {
  return manager.save(
    manager.create(VehicleDeadlineAlertPolicy, {
      companyId,
      enabledDeadlineKinds: [...DEFAULT_VEHICLE_DEADLINE_KINDS],
      leadDays: [...DEFAULT_VEHICLE_DEADLINE_LEAD_DAYS],
      timeZone: DEFAULT_VEHICLE_DEADLINE_TIME_ZONE,
      activatedAt,
    }),
  );
}
