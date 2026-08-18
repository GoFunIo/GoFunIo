export type ServiceType = 'FULL' | 'OIL_CHANGE' | 'TECHNICAL_INSPECTION' | 'OC' | 'AC' | 'OTHER';

export type ServiceVehicle = {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
};

export type ServiceData = {
  id: string;
  vehicleId: string;
  serviceDate: string;
  type: ServiceType;
  cost: string;
  providerName: string;
  notes: string;
  vehicle: ServiceVehicle;
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
  type?: ServiceType;
};
