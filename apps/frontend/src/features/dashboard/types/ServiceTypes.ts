import { AddServiceFormData } from '../lib/formValidationRules';
import { AttachmentData } from './AttachmentTypes';

export type ServiceActions =
  | 'add_service'
  | 'edit_service'
  | 'delete_service'
  | 'attachments'
  | null;
export type ServiceType = 'FULL' | 'OIL_CHANGE' | 'TECHNICAL_INSPECTION' | 'OC' | 'AC' | 'OTHER';
export type ServiceIdType = string | null;

export type ServiceVehicle = {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
};

export type CreateServiceData = Omit<AddServiceFormData, 'attachments'>;

export type ServiceData = {
  id: string;
  vehicleId: string;
  serviceDate: string;
  type: ServiceType;
  cost: string;
  providerName: string;
  notes: string;
  vehicle: ServiceVehicle;
  hasAttachment: boolean;
};

export type SingleServiceData = {
  id: string;
  vehicleId: string;
  serviceDate: string;
  type: ServiceType;
  cost: string;
  providerName: string;
  notes: string;
  vehicle: ServiceVehicle;
  attachments: AttachmentData[];
};

export type PaginatedServices = {
  items: ServiceData[];
  total: number;
  totalCost: string;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ServiceListParams = {
  page?: number;
  pageSize?: number;
  vehicleId?: string;
  type?: ServiceType;
  providerName?: string;
  from?: string;
  to?: string;
};

export type ServicesFiltersType = {
  vehicleId: string | null;
  type: ServiceType | null;
  from: Date | undefined;
  to: Date | undefined;
};
