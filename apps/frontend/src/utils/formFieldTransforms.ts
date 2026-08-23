import { UseFormRegisterReturn } from 'react-hook-form';

export const withTransform = (
  field: UseFormRegisterReturn,
  transform: (value: string) => string,
): UseFormRegisterReturn => ({
  ...field,
  onChange: (e) => {
    e.target.value = transform(e.target.value);
    return field.onChange(e);
  },
});

export const toUpperCase = (value: string) => value.toUpperCase();
export const toUpperCaseNoSpaces = (value: string) => value.replace(/\s/g, '').toUpperCase();
export const capitalizeWords = (value: string) =>
  value.replace(/(^|\s)([a-ząćęłńóśźż])/gi, (_match, sep, char) => sep + char.toUpperCase());
