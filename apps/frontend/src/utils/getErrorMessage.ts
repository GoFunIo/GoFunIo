type ApiError = {
  status?: number;
};

type ErrorMessages = Partial<Record<number, string>>;

const DEFAULT_MESSAGES: ErrorMessages = {
  0: 'Brak połączenia z internetem.',
};

export function getErrorMessage(error: unknown, messages: ErrorMessages = {}): string {
  const status = (error as ApiError).status;

  if (status !== undefined) {
    return (
      messages[status] ?? DEFAULT_MESSAGES[status] ?? 'Błąd serwera. Spróbuj ponownie później.'
    );
  }

  return 'Błąd serwera. Spróbuj ponownie później.';
}
