import type { FleetService, FleetVehicle } from '../fleet/fleet-unit-of-work';

export interface ServiceView extends FleetService {
  vehicle: FleetVehicle;
}
