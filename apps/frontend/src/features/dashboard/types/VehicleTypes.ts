export type VehicleActions = 'add_car' | 'edit_car' | 'delete_car' | 'renew_car' | null;
export type VehicleIdType = string | null;
export type VehicleFuelType = 'DIESEL' | 'PETROL' | 'LPG' | 'HYBRID' | 'ELECTRIC';

export interface VehicleManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface VehicleDriver {
  id: string;
  firstName: string;
  lastName: string;
}

export interface VehicleData {
  id: string;
  managers: VehicleManager[];
  drivers: VehicleDriver[];
  brand: string;
  model: string;
  productionYear: number | null;
  fuelType: VehicleFuelType | null;
  vin: string | null;
  registrationNumber: string;
  currentMileage: number | null;
  purchaseDate: string | null;
  ocExpiry: string | null;
  acExpiry: string | null;
  technicalInspectionExpiry: string | null;
  notes: string | null;
}

export interface VehicleListResponse {
  items: VehicleData[];

  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VehicleManagerAssignment {
  id: string;
  managerId: string;
  vehicleId: string;
  assignedFrom: string;
  assignedTo: string | null;
  createdAt: string;
}

export interface VehicleDriverAssignment {
  id: string;
  driverId: string;
  vehicleId: string;
  assignedFrom: string;
  assignedTo: string | null;
  createdAt: string;
}
