/* ==========================================================================
   WSPÓLNE TYPY DLA FLOTY POJAZDÓW (ODPOWIEDNIKI BAZOWYCH DTO Z BACKENDU)
   ========================================================================== */

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

// GET /vehicles oraz GET /vehicles/{id}.
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

// Paginacja GET /vehicles
export interface VehicleListResponse {
  items: VehicleData[];

  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Historia przypisań managerów do pojazdu.
// GET /vehicles/{id}/manager-assignments
export interface VehicleManagerAssignment {
  id: string;
  managerId: string;
  vehicleId: string;
  assignedFrom: string;
  assignedTo: string | null;
  createdAt: string;
}

// Historia przypisań kierowców do pojazdu.
// GET /vehicles/{vehicleId}/driver-assignments.
export interface VehicleDriverAssignment {
  id: string;
  driverId: string;
  vehicleId: string;
  assignedFrom: string;
  assignedTo: string | null;
  createdAt: string;
}
