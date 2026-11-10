import { isUUID, ValidateBy, type ValidationOptions } from 'class-validator';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';

export const MAX_CUSTOM_VEHICLE_DEADLINE_KINDS = 20;
export const MAX_VEHICLE_DEADLINE_KINDS =
  Object.values(VehicleDeadlineKind).length + MAX_CUSTOM_VEHICLE_DEADLINE_KINDS;

export const DEFAULT_CUSTOM_VEHICLE_DEADLINE_LABELS = [
  'Wymiana oleju',
  'Wymiana świec',
] as const;

export const BUILT_IN_VEHICLE_DEADLINE_LABELS: Record<
  VehicleDeadlineKind,
  string
> = {
  [VehicleDeadlineKind.OC]: 'Ubezpieczenie OC',
  [VehicleDeadlineKind.AC]: 'Ubezpieczenie AC',
  [VehicleDeadlineKind.TECHNICAL_INSPECTION]: 'Przegląd techniczny',
};

const FALLBACK_LABEL = 'Termin';

export function isBuiltInVehicleDeadlineKind(
  kind: string,
): kind is VehicleDeadlineKind {
  return Object.values<string>(VehicleDeadlineKind).includes(kind);
}

export function vehicleDeadlineLabel(
  kind: string,
  customLabel: string | null | undefined,
): string {
  return isBuiltInVehicleDeadlineKind(kind)
    ? BUILT_IN_VEHICLE_DEADLINE_LABELS[kind]
    : (customLabel ?? FALLBACK_LABEL);
}

export function IsVehicleDeadlineKindKey(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isVehicleDeadlineKindKey',
      validator: {
        validate: (value) =>
          typeof value === 'string' &&
          (isBuiltInVehicleDeadlineKind(value) || isUUID(value)),
        defaultMessage: () =>
          'deadline kind must be a built-in kind or a custom kind id',
      },
    },
    options,
  );
}
