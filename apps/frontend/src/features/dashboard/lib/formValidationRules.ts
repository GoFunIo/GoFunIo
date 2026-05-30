import * as yup from 'yup';

// 1. Schemat dla dodawania pojazdu
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

// 2. Schemat dla wpisu serwisowego
export const AddServiceSchema = yup.object().shape({
  vehicleId: yup.string().required('Wybór pojazdu jest wymagany'),
  serviceDate: yup.string().required('Data serwisu jest wymagana'),
  serviceType: yup.string().required('Podaj rodzaj serwisu'),
  cost: yup
    .number()
    .typeError('Koszt musi być liczbą')
    .positive('Koszt musi być większy od 0')
    .required('Podaj koszt usługi'),
  servicePlace: yup.string().required('Nazwa warsztatu jest wymagana'),
  notes: yup.string().nullable(),
  attachment: yup.string().nullable(),
});
