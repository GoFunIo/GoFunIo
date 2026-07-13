export const vehicleTransforms = {
  trim: ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  optionalText: ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  registration: ({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim().toUpperCase().replace(/[\s-]/g, '')
      : value,
  vin: ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  number: ({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
};
