import type { SessionPrincipal } from '../users/session-principal';
import type { ListVehiclesQueryDto } from '../vehicles/dtos/list-vehicles-query.dto';
import type { FleetVehicle } from './fleet-unit-of-work';

export const VEHICLE_ACCESS = Symbol('VEHICLE_ACCESS');

export interface FleetManagerAssignment {
  id: string;
  companyId: string;
  managerId: string;
  vehicleId: string;
  assignedFrom: Date;
  assignedTo: Date | null;
  createdAt: Date;
}

export interface FleetVehiclePage {
  items: FleetVehicle[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VehicleAccess {
  list(
    actor: SessionPrincipal,
    query: ListVehiclesQueryDto,
  ): Promise<FleetVehiclePage>;
  find(actor: SessionPrincipal, vehicleId: string): Promise<FleetVehicle>;
  history(
    actor: SessionPrincipal,
    vehicleId: string,
  ): Promise<FleetManagerAssignment[]>;
  activeManagerIds(
    companyId: string,
    vehicleIds: string[],
  ): Promise<Map<string, string[]>>;
  closeManager(companyId: string, managerId: string): Promise<void>;
}
