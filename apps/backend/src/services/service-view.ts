import type { FleetService, FleetVehicle } from '../fleet/fleet-unit-of-work';

export interface ServiceView extends FleetService {
  vehicle: FleetVehicle;
}

export interface ServiceListView extends ServiceView {
  hasAttachment: boolean;
}

export interface ServicePage {
  items: ServiceListView[];
  total: number;
  totalCost: string;
  page: number;
  pageSize: number;
  totalPages: number;
}
