import * as yup from 'yup';

export const AddVehicleSchema = yup
  .object({
    brand: yup.string().required('Marka samochodu jest wymagana'),
    model: yup.string().required('Model samochodu jest wymagany'),
    productionYear: yup.string().optional(),
    fuelType: yup.string().optional(),
    vin: yup
      .string()
      .transform((value) => (value === '' ? undefined : value))
      .nullable()
      .min(17, 'Numer VIN musi mieć dokładnie 17 znaków.')
      .max(17, 'Numer VIN musi mieć dokładnie 17 znaków.')
      .matches(/^[A-HJ-NPR-Z0-9]*$/, 'VIN nie może zawierać liter I, O oraz Q.'),
    registrationNumber: yup.string().required('Numer rejestracyjny jest wymagany.'),
    currentMileage: yup
      .number()
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .optional(),
    purchaseDate: yup.string().optional(),
    ocExpiry: yup.string().optional(),
    acExpiry: yup.string().optional(),
    technicalInspectionExpiry: yup.string().optional(),
    notes: yup.string().optional(),
  })
  .required();

export type AddVehicleFormData = yup.InferType<typeof AddVehicleSchema>;
