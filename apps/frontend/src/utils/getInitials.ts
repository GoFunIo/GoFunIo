export const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((name) => name![0].toUpperCase())
    .join('');

  return initials || 'U';
};
