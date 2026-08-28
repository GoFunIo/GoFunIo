import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import type { FleetVehicle } from '../fleet/fleet-unit-of-work';

export const VEHICLE_DEADLINE_FIELDS = {
  [VehicleDeadlineKind.OC]: 'ocExpiry',
  [VehicleDeadlineKind.AC]: 'acExpiry',
  [VehicleDeadlineKind.TECHNICAL_INSPECTION]: 'technicalInspectionExpiry',
} as const satisfies Record<VehicleDeadlineKind, keyof FleetVehicle>;

export interface VehicleDeadlineTriggerIdentity {
  companyId: string;
  vehicleId: string;
  deadlineKind: VehicleDeadlineKind;
  deadlineDate: string;
  leadDay: number;
}

export function vehicleDeadlineTriggerKey(
  trigger: VehicleDeadlineTriggerIdentity,
): string {
  return `${trigger.companyId}:${trigger.vehicleId}:${trigger.deadlineKind}:${trigger.deadlineDate}:${trigger.leadDay}`;
}

export function vehicleDeadlineDate(
  vehicle: Pick<
    FleetVehicle,
    'ocExpiry' | 'acExpiry' | 'technicalInspectionExpiry'
  >,
  kind: VehicleDeadlineKind,
): string | null {
  return vehicle[VEHICLE_DEADLINE_FIELDS[kind]];
}
