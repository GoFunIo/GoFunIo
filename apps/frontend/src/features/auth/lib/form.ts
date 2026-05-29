import React from 'react';
import { FormProps } from '../types/types';

type SetState<T> = (value: T | ((prev: T) => T)) => void;

export const handleChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  input: string,
  setForm: SetState<FormProps>,
  setErrors: SetState<FormProps>,
) => {
  const value = e.target.value;

  setForm((prev) => ({
    ...prev,
    [input]: value,
  }));

  setErrors((prev) => ({
    ...prev,
    [input]: '',
  }));
};
