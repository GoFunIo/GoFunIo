export const formatPostalCode = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  if (digits.length > 2) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
  }

  return digits;
};
