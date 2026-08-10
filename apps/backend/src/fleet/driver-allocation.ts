import type { SessionPrincipal } from '../users/session-principal';
import type { FleetDriver, FleetDriverAssignment } from './fleet-unit-of-work';

export const DRIVER_ALLOCATION = Symbol('DRIVER_ALLOCATION');

export interface FleetDriverProjection {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FleetActiveVehicleProjection {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
}

export interface DriverAllocationStore {
  requireActor(actor: SessionPrincipal): Promise<void>;
  find(
    actor: SessionPrincipal,
    driverId: string,
    lock?: boolean,
  ): Promise<FleetDriver>;
  assign(
    companyId: string,
    vehicleId: string,
    driverId: string,
  ): Promise<FleetDriverAssignment>;
  unassign(
    companyId: string,
    vehicleId: string,
    driverId: string,
  ): Promise<void>;
  history(
    companyId: string,
    vehicleId: string,
  ): Promise<FleetDriverAssignment[]>;
  activeDrivers(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, FleetDriverProjection | null>>;
  closeDriver(companyId: string, driverId: string): Promise<void>;
  closeVehicle(companyId: string, vehicleId: string): Promise<void>;
}

export interface DriverAllocation {
  list(actor: SessionPrincipal): Promise<FleetDriver[]>;
  find(actor: SessionPrincipal, driverId: string): Promise<FleetDriver>;
  activeVehicles(
    actor: SessionPrincipal,
    driverIds: string[],
  ): Promise<Map<string, FleetActiveVehicleProjection[]>>;
  activeDrivers(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, FleetDriverProjection | null>>;
}
