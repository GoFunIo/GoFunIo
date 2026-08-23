import { VehicleFuelType } from '../types';

export const FUEL_OPTIONS: { id: number; value: VehicleFuelType; label: string }[] = [
  { id: 1, value: 'DIESEL', label: 'Diesel' },
  { id: 2, value: 'PETROL', label: 'Benzyna' },
  { id: 3, value: 'LPG', label: 'LPG' },
  { id: 4, value: 'HYBRID', label: 'Hybryda' },
  { id: 5, value: 'ELECTRIC', label: 'Elektryk' },
];

export const fuelTypeLabels: Record<VehicleFuelType, string> = FUEL_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<VehicleFuelType, string>,
);
