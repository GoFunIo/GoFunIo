import { ValidateBy, type ValidationOptions } from 'class-validator';

export const NEW_PASSWORD_MIN_LENGTH = 8;
export const NEW_PASSWORD_MAX_LENGTH = 128;

function containsOnlyAscii(value: string): boolean {
  return [...value].every((character) => character.charCodeAt(0) <= 0x7f);
}

export function isNewPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= NEW_PASSWORD_MIN_LENGTH &&
    value.length <= NEW_PASSWORD_MAX_LENGTH &&
    containsOnlyAscii(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function IsNewPassword(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isNewPassword',
      validator: {
        validate: isNewPassword,
        defaultMessage: () => 'password does not meet security requirements',
      },
    },
    validationOptions,
  );
}
