import type { FleetActiveVehicleProjection } from '../fleet/driver-allocation';
import type { FleetDriver } from '../fleet/fleet-unit-of-work';

export interface DriverView extends FleetDriver {
  activeVehicles: FleetActiveVehicleProjection[];
}
