export const getUserFullName = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
) => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  // if (user?.name) {
  //     return user.name;
  // }
  // Fallback
  return email?.split('@')[0] ?? 'Użytkownik';
};
