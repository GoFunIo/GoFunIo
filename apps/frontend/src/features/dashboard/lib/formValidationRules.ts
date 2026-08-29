import * as yup from 'yup';
import { isPasswordValid } from '@/features/auth/lib/passwordRules';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';

// =========================================================================
// 1. SCHEMAT DLA DODAWANIA POJAZDU
// =========================================================================
export const AddVehicleSchema = yup
  .object({
    brand: yup.string().trim().required('Marka samochodu jest wymagana'),
    model: yup.string().trim().required('Model samochodu jest wymagany'),
    productionYear: yup
      .string()
      .nullable()
      .optional()
      .test('not-in-future', 'Rok produkcji nie może być z przyszłości.', (value) => {
        if (!value || value === '') return true;
        const year = Number(value);
        const currentYear = new Date().getFullYear();
        return year >= 1900 && year <= currentYear;
      }),

    fuelType: yup.string().nullable().optional(),
    vin: yup
      .string()
      .transform((value) => (value === '' ? undefined : value))
      .nullable()
      .optional()
      .test('len', 'Numer VIN musi mieć dokładnie 17 znaków.', (val) => !val || val.length === 17)
      .matches(/^[A-HJ-NPR-Z0-9]*$/, 'VIN nie może zawierać liter I, O oraz Q.'),

    registrationNumber: yup.string().trim().required('Numer rejestracyjny jest wymagany.'),
    currentMileage: yup
      .number()
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .nullable()
      .optional()
      .integer('Przebieg musi być liczbą całkowitą.')
      .min(0, 'Przebieg musi być liczbą dodatnią.'),

    purchaseDate: yup
      .string()
      .nullable()
      .optional()
      .test('not-in-future', 'Data zakupu nie może być z przyszłości.', (value) => {
        if (!value || value === '') return true;
        return new Date(value) <= new Date();
      }),

    ocExpiry: yup.string().nullable().optional(),
    acExpiry: yup.string().nullable().optional(),
    technicalInspectionExpiry: yup.string().nullable().optional(),
    notes: yup.string().nullable().optional(),
  })
  .required();

// =========================================================================
// 2. SCHEMAT DLA WPISU SERWISOWEGO
// =========================================================================
export const AddServiceSchema = yup.object().shape({
  vehicleId: yup.string().required('Wybór pojazdu jest wymagany'),
  serviceDate: yup
    .string()
    .required('Data serwisu jest wymagana')
    .test('not-in-future', 'Data serwisu nie może być z przyszłości.', (value) => {
      if (!value || value === '') return true;
      return new Date(value) <= new Date();
    }),
  serviceType: yup.string().required('Podaj rodzaj serwisu'),
  cost: yup
    .number()
    .typeError('Koszt musi być liczbą')
    .positive('Koszt musi być większy od 0')
    .required('Podaj koszt usługi'),
  servicePlace: yup.string().required('Nazwa warsztatu jest wymagana'),
  notes: yup.string().default(''),
  attachments: yup
    .array()
    .of(
      yup.object({
        id: yup.string().optional(),
        file: yup.mixed<File>().optional(),
        name: yup.string().required(),
        mimeType: yup.string().required(),
        size: yup.number().required(),
        createdAt: yup.string().required(),
      }),
    )
    .required()
    .max(MAX_FILES_PER_UPLOAD, `Maksymalnie można dodać ${MAX_FILES_PER_UPLOAD} plików`)
    .default([]),
});

// =========================================================================
// 3. DANE OSOBOWE
// =========================================================================
export const PersonalDataSchema = yup.object({
  email: yup.string().optional().default(''),
  firstName: yup.string().default(''),
  lastName: yup.string().default(''),
  phone: yup
    .string()
    .default('')
    .matches(/^\+?[0-9\s\-()]{7,20}$/, {
      message: 'Nieprawidłowy numer telefonu',
      excludeEmptyString: true,
    }),
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

// =========================================================================
// 4. DANE FIRMOWE
// =========================================================================
export const CompanyDataSchema = yup.object({
  sameAsPersonal: yup.boolean().default(false),
  name: yup.string().required('Nazwa firmy jest wymagana'),
  email: yup
    .string()
    .required('Adres e-mail jest wymagany')
    .email('Wprowadź poprawny adres e-mail'),
  nip: yup
    .string()
    .required('NIP jest wymagany')
    .transform((value: string) => (value ? value.replace(/[\s-]/g, '') : ''))
    .matches(/^\d{10}$/, 'NIP musi mieć dokładnie 10 cyfr'),
  address: yup.string().when('sameAsPersonal', {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.required('Adres firmy jest wymagany'),
  }),
  city: yup.string().when('sameAsPersonal', {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.required('Miasto jest wymagane'),
  }),
  postalCode: yup.string().when('sameAsPersonal', {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) =>
      schema.required('Kod pocztowy jest wymagany').matches(/^\d{2}-\d{3}$/, 'Format 00-000'),
  }),
  phone: yup
    .string()
    .required('Telefon jest wymagany')
    .default('')
    .matches(/^\+?[0-9\s\-()]{7,20}$/, {
      message: 'Nieprawidłowy numer telefonu',
      excludeEmptyString: true,
    }),
});

// =========================================================================
// 5. EDYCJA E-MAIL
// =========================================================================
export const ChangeEmailSchema = yup.object({
  newEmail: yup
    .string()
    .email('Podaj prawidłowy e-mail')
    .required('Niepoprawny format adresu e-mail'),
  currentPassword: yup.string().required('Podaj prawidłowe hasło'),
});

// =========================================================================
// 6. EDYCJA HASŁA
// =========================================================================
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

// =========================================================================
// 7. SCHEMAT DLA UŻYTKOWNIKA SYSTEMU
// =========================================================================
export const UserManagementSchema = yup.object({
  firstName: yup.string().required('Imię jest wymagane'),
  lastName: yup.string().required('Nazwisko jest wymagane'),
  email: yup.string().email('Podaj prawidłowy e-mail').required('Adres e-mail jest wymagany'),
  role: yup.string().required('Wybór roli jest wymagany'),
  sendInvite: yup.boolean().default(false),
});

// =========================================================================
// 8. SCHEMAT DLA KIEROWCÓW
// =========================================================================
export const DriverManagementSchema = yup.object({
  firstName: yup.string().required('Imię jest wymagane'),
  lastName: yup.string().required('Nazwisko jest wymagane'),
  email: yup.string().email('Podaj prawidłowy e-mail').required('Adres e-mail jest wymagany'),
  phone: yup
    .string()
    .required('Numer telefonu jest wymagany')
    .matches(/^\+?[0-9\s\-()]{7,20}$/, {
      message: 'Nieprawidłowy numer telefonu',
      excludeEmptyString: true,
    }),
  notes: yup.string().default(''),
});

// Eksport typów TypeScript dla inferencji danych
export type AddVehicleFormData = yup.InferType<typeof AddVehicleSchema>;
export type AddServiceFormData = yup.InferType<typeof AddServiceSchema>;
export type PersonalDataFormData = yup.InferType<typeof PersonalDataSchema>;
export type CompanyDataFormData = yup.InferType<typeof CompanyDataSchema>;
export type ChangeEmailFormData = yup.InferType<typeof ChangeEmailSchema>;
export type ChangePasswordFormData = yup.InferType<typeof ChangePasswordSchema>;
export type UserManagementFormData = yup.InferType<typeof UserManagementSchema>;
