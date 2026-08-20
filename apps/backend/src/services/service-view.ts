import type { FleetService, FleetVehicle } from '../fleet/fleet-unit-of-work';
import type { ServiceAttachmentView } from '../service-attachments/service-attachment-query';

export interface ServiceBaseView extends FleetService {
  vehicle: FleetVehicle;
}

export interface ServiceView extends ServiceBaseView {
  attachments: ServiceAttachmentView[];
}

export interface ServiceListView extends ServiceBaseView {
  attachmentCount: number;
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
