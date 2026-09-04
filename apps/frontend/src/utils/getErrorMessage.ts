type ApiError = {
  code?: string;
  error?: string;
  message?: string;
  statusCode?: number;
};

type ErrorMessages = Record<string, string>;
type CustomErrorMessages = Partial<Record<string | number, string>>;

const ERROR_MESSAGES: ErrorMessages = {
  VEHICLE_REGISTRATION_IN_USE: 'Pojazd o takim numerze rejestracyjnym już istnieje.',
  VEHICLE_VIN_IN_USE: 'Pojazd o takim numerze VIN już istnieje.',
  EMAIL_IN_USE: 'Ten adres e-mail jest już używany.',
  CANNOT_DEMOTE_SELF: 'Nie możesz zmienić własnej roli.',
  CANNOT_DELETE_SELF: 'Nie możesz usunąć własnego konta.',
  TRANSFER_OWNERSHIP_FIRST: 'Najpierw przenieś własność pojazdu.',
  OWNERSHIP_REQUIRES_ADMIN: 'Tylko administrator może przejąć własność.',
  ALREADY_WORKSPACE_MEMBER: 'Użytkownik jest już członkiem workspace.',
  ACCOUNT_UNAVAILABLE: 'To konto jest niedostępne.',
  MEMBERSHIP_ALREADY_LINKED: 'To członkostwo jest już przypisane.',
  SIGN_OUT_BEFORE_VERIFY: 'Wyloguj się przed weryfikacją.',
  GOOGLE_ACCOUNT_CONFLICT: 'To konto Google jest już powiązane z innym kontem.',
  SET_PASSWORD_BEFORE_EMAIL_CHANGE: 'Ustaw hasło przed zmianą adresu e-mail.',
  USE_PASSWORD_RESET_TO_SET_PASSWORD: 'Użyj resetowania hasła, aby ustawić nowe hasło.',
  VERIFY_EMAIL_BEFORE_GOOGLE_LINK: 'Najpierw zweryfikuj adres e-mail.',
  SIGN_IN_BEFORE_GOOGLE_LINK: 'Zaloguj się przed połączeniem konta Google.',
  GOOGLE_LINK_CHANGED_CONCURRENTLY:
    'Połączenie z kontem Google zostało zmienione. Spróbuj ponownie.',
  SERVICE_ATTACHMENT_LIMIT_REACHED: 'Osiągnięto limit załączników.',
  ATTACHMENT_TYPE_NOT_ALLOWED: 'Niedozwolony typ pliku.',
  ATTACHMENT_PREVIEW_NOT_AVAILABLE: 'Podgląd pliku jest niedostępny.',
};

const DEFAULT_ERROR_MESSAGE = 'Wystąpił nieprzewidziany błąd. Spróbuj ponownie później.';

const NO_CONNECTION_ERROR_MESSAGE = 'Brak połączenia z internetem.';

export function getErrorMessage(error: unknown, customMessages: CustomErrorMessages = {}): string {
  const { code, statusCode } = error as ApiError;

  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  if (statusCode !== undefined && customMessages[statusCode]) {
    return customMessages[statusCode];
  }

  if (statusCode === 0) {
    return NO_CONNECTION_ERROR_MESSAGE;
  }

  return DEFAULT_ERROR_MESSAGE;
}
