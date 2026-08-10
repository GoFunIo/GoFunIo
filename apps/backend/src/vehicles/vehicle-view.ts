import type { FleetDriverProjection } from '../fleet/driver-allocation';
import type { FleetVehicle } from '../fleet/fleet-unit-of-work';
import type { FleetManagerProjection } from '../fleet/vehicle-access';

export interface VehicleView extends FleetVehicle {
  managers: FleetManagerProjection[];
  drivers: FleetDriverProjection[];
}
