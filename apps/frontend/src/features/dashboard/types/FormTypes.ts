import * as yup from 'yup';
import { AddVehicleSchema } from '../lib/formValidationRules';

export type AddVehicleFormData = yup.InferType<typeof AddVehicleSchema>;

export type AddVehicleInputs = {
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
