export const getInitials = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
) => {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  return email?.slice(0, 2).toUpperCase() ?? 'U';
};
