/* ==========================================================================
   WSPÓLNE TYPY DLA FLOTY POJAZDÓW (ODPOWIEDNIKI BAZOWYCH DTO Z BACKENDU)
   ========================================================================== */

export type VehicleFuelType = 'DIESEL' | 'PETROL' | 'LPG' | 'HYBRID' | 'ELECTRIC';

export interface VehicleData {
  id: string;
  managerIds: string[];
  driverIds: string[];
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
