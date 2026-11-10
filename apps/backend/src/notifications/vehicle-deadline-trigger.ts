export interface VehicleDeadlineTriggerIdentity {
  companyId: string;
  vehicleId: string;
  deadlineKind: string;
  deadlineDate: string;
  leadDay: number;
}

export function vehicleDeadlineTriggerKey(
  trigger: VehicleDeadlineTriggerIdentity,
): string {
  return `${trigger.companyId}:${trigger.vehicleId}:${trigger.deadlineKind}:${trigger.deadlineDate}:${trigger.leadDay}`;
}
