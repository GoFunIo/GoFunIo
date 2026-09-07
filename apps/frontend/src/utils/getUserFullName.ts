export const getUserFullName = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
) => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  return email?.split('@')[0] ?? 'Użytkownik';
};
