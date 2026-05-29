import {
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
  SignupSchema,
} from '../lib/formValidationRules';
import * as yup from 'yup';

export type SignupFormData = yup.InferType<typeof SignupSchema>;
export type LoginFormData = yup.InferType<typeof LoginSchema>;
export type ForgotPasswordFormData = yup.InferType<typeof ForgotPasswordSchema>;
export type ResetPasswordFormData = yup.InferType<typeof ResetPasswordSchema>;

export type SignupInputs = {
  email: string;
  password: string;
  passwordConfirm: string;
};

export type LoginInputs = {
  email: string;
  password: string;
};

export type ForgotPasswordInputs = {
  email: string;
};

export type ResetPassordInputs = {
  password: string;
  passwordConfirm: string;
};
