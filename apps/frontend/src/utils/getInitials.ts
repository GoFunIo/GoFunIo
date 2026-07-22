export const getInitials = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
) => {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  // if (user?.name) {
  //   const parts = user.name.trim().split(' ');
  //   if (parts.length >= 2) {
  //     return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  //   }
  //   return parts[0].slice(0, 2).toUpperCase();
  // }
  return email?.slice(0, 2).toUpperCase() ?? 'U';
};
