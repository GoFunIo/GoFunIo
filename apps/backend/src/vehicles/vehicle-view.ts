import type { FleetVehicle } from '../fleet/fleet-unit-of-work';

export interface VehicleView extends FleetVehicle {
  managerIds: string[];
  driverIds: string[];
}
