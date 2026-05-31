export type AddVehicleInputs = {
  id?: number | string;
  brand: string;
  model: string;
  productionYear?: string | null;
  fuelType?: string | null;
  vin?: string | null;
  registrationNumber?: string | null;
  currentMileage?: number | null;
  purchaseDate?: string | null;
  ocExpiry?: string | null;
  acExpiry?: string | null;
  technicalInspectionExpiry?: string | null;
  notes?: string | null;
};

export type AddServiceInputs = {
  id?: number | string;
  vehicleId: string;
  serviceDate: string;
  serviceType: string;
  cost: number;
  servicePlace: string;
  notes?: string | null;
  attachment?: string | null;
};
