import type { EntityManager } from 'typeorm';
import { VehicleDeadlineCustomKind } from '../vehicle-deadline-kinds/vehicle-deadline-custom-kind.entity';
import { DEFAULT_CUSTOM_VEHICLE_DEADLINE_LABELS } from '../vehicle-deadline-kinds/vehicle-deadline-kind-catalog';
import {
  DEFAULT_VEHICLE_DEADLINE_KINDS,
  DEFAULT_VEHICLE_DEADLINE_LEAD_DAYS,
  DEFAULT_VEHICLE_DEADLINE_TIME_ZONE,
  VehicleDeadlineAlertPolicy,
} from './vehicle-deadline-alert-policy.entity';

export async function provisionVehicleDeadlineAlertPolicy(
  manager: EntityManager,
  companyId: string,
  activatedAt: Date,
): Promise<VehicleDeadlineAlertPolicy> {
  const customKindIds: string[] = [];
  for (const label of DEFAULT_CUSTOM_VEHICLE_DEADLINE_LABELS) {
    const kind = await manager.save(
      manager.create(VehicleDeadlineCustomKind, { companyId, label }),
    );
    customKindIds.push(kind.id);
  }
  return manager.save(
    manager.create(VehicleDeadlineAlertPolicy, {
      companyId,
      enabledDeadlineKinds: [
        ...DEFAULT_VEHICLE_DEADLINE_KINDS,
        ...customKindIds,
      ],
      leadDays: [...DEFAULT_VEHICLE_DEADLINE_LEAD_DAYS],
      timeZone: DEFAULT_VEHICLE_DEADLINE_TIME_ZONE,
      activatedAt,
    }),
  );
}
