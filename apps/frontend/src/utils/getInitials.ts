export const getInitials = (fullName: string) => {
  const words = fullName.split(' ');

  return `${words[0].charAt(0)}${words[1].charAt(0)}`;
};
