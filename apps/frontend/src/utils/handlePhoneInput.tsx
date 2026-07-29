export const handlePhoneInput = (value: string) => {
  return value.replace(/[^\d+\s\-()]/g, '');
};
