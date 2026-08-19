export type ServiceType = 'FULL' | 'OIL_CHANGE' | 'TECHNICAL_INSPECTION' | 'OC' | 'AC' | 'OTHER';

export const serviceTypeOptions: { id: number; value: ServiceType; label: string }[] = [
  { id: 1, value: 'FULL', label: 'Pełny serwis' },
  { id: 2, value: 'OIL_CHANGE', label: 'Wymiana oleju' },
  { id: 3, value: 'TECHNICAL_INSPECTION', label: 'Przegląd techniczny' },
  { id: 4, value: 'OC', label: 'Ubezpieczenie OC' },
  { id: 5, value: 'AC', label: 'Ubezpieczenie AC' },
  { id: 6, value: 'OTHER', label: 'Inne' },
];

export const serviceTypeLabels: Record<ServiceType, string> = serviceTypeOptions.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<ServiceType, string>,
);

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
  hasAttachment: boolean;
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
