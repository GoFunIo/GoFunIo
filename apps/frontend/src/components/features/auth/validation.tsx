// rules for inputs

import { FormProps } from './types';

export const required = (value: string) => {
  if (!value.trim()) {
    return 'Pole jest puste';
  }

  return '';
};

export const email = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(value) ? '' : 'Nieprawidłowy format e-maila';
};

export const minLength = (value: string) => {
  if (value.length < 2) {
    return 'Pole musi zawierać co najmniej 8 znaków';
  }

  return '';
};

// combine rules and set validation order

export const compose =
  (...validators: ((value: string) => string)[]) =>
  (value: string) =>
    validators.map((fn) => fn(value)).find((msg) => msg) || '';

export const validators: Record<string, (value: string) => string> = {
  email: compose(required, email),
  password: compose(required, minLength),
  name: compose(required, minLength),
  surname: compose(required, minLength),
};

// validations

export const validateField = (value: string, field: string) => {
  const validator = validators[field];

  return validator ? validator(value) : '';
};

export const validateForm = (form: FormProps) => {
  const currentErrors: FormProps = {};

  for (const key in form) {
    currentErrors[key] = validateField(form[key], key);
  }

  const isValid = Object.values(currentErrors).every((item) => !item);

  return { currentErrors, isValid };
};

export const isFormEmpty = (form: FormProps) => {
  return Object.values(form).some((item) => item.trim() === '');
};
