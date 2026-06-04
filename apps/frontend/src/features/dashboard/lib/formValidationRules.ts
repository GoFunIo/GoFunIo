import { isPasswordValid } from '@/features/auth/lib/passwordRules';
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

// 3. DANE OSOBOWE
export const PersonalDataSchema = yup.object({
  firstName: yup.string().default(''),
  lastName: yup.string().default(''),
  phone: yup.string().default(''),
  address: yup.string().default(''),
  city: yup.string().default(''),

  postalCode: yup
    .string()
    .default('')
    .matches(/^\d{2}-\d{3}$/, {
      message: 'Format 00-000',
      excludeEmptyString: true,
    }),
});

// 4. DANE FIRMOWE
export const CompanyDataSchema = yup.object({
  sameAsPersonal: yup.boolean().default(false),
  companyName: yup.string().required('Nazwa firmy jest wymagana'),
  nip: yup
    .string()
    .matches(/^\d{10}$/, 'NIP musi mieć dokładnie 10 cyfr')
    .required('Podaj prawidłowy NIP'),
  companyAddress: yup.string().required('Adres firmy jest wymagany'),
  companyPostalCode: yup
    .string()
    .matches(/^\d{2}-\d{3}$/, 'Format 00-000')
    .required('Kod pocztowy jest wymagany'),
  companyCity: yup.string().required('Miasto jest wymagane'),
});

// 5. EDYCJA E-MAIL
export const ChangeEmailSchema = yup.object({
  newEmail: yup.string().email('Podaj prawidłowy e-mail').required('Podaj prawidłowy e-mail'),
  confirmEmail: yup
    .string()
    .oneOf([yup.ref('newEmail')], 'Nowy e-mail musi być identyczny')
    .required('Powtórz e-mail'),
});

// 6. EDYCJA HASŁA
export const ChangePasswordSchema = yup.object({
  currentPassword: yup.string().required('Podaj prawidłowe hasło'),
  newPassword: yup
    .string()
    .required('Wprowadź nowe hasło')
    .test('password-rules', 'Hasło nie spełnia wszystkich wymogów bezpieczeństwa', (value) => {
      return isPasswordValid(value || '');
    }),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Nowe hasła muszą być identyczne')
    .required('Powtórz nowe hasło'),
});

// 7. Schemat dla użytkownika systemu
export const UserManagementSchema = yup.object({
  firstName: yup.string().default(''),
  lastName: yup.string().default(''),
  email: yup.string().email('Podaj prawidłowy e-mail').required('Adres e-mail jest wymagany'),
  role: yup.string().required('Wybór roli jest wymagany'),
  sendInvite: yup.boolean().default(false),
});

export type AddVehicleFormData = yup.InferType<typeof AddVehicleSchema>;
export type AddServiceFormData = yup.InferType<typeof AddServiceSchema>;
export type PersonalDataFormData = yup.InferType<typeof PersonalDataSchema>;
export type CompanyDataFormData = yup.InferType<typeof CompanyDataSchema>;
export type ChangeEmailFormData = yup.InferType<typeof ChangeEmailSchema>;
export type ChangePasswordFormData = yup.InferType<typeof ChangePasswordSchema>;
export type UserManagementFormData = yup.InferType<typeof UserManagementSchema>;
