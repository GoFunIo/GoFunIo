import * as yup from 'yup';
import { isPasswordValid } from '../lib/passwordRules';

export const LoginSchema = yup
  .object({
    email: yup
      .string()
      .required('Adres e-mail jest wymagany')
      .email('Wprowadź poprawny adres e-mail'),
    password: yup.string().required('Hasło jest wymagane'),
  })
  .required();

export const SignupSchema = yup
  .object({
    email: yup
      .string()
      .required('Adres e-mail jest wymagany')
      .email('Wprowadź poprawny adres e-mail'),
    password: yup
      .string()
      .required('Hasło jest wymagane')
      .matches(/^[\x00-\x7F]+$/, 'Dozwolone są tylko angielskie litery, cyfry i symbole')
      .test('password-validation', 'Hasło nie spełnia wymagań', isPasswordValid),
    passwordConfirm: yup
      .string()
      .required('Powtórz hasło')
      .oneOf([yup.ref('password')], 'Hasła muszą być identyczne'),
  })
  .required();

export const ForgotPasswordSchema = yup
  .object({
    email: yup
      .string()
      .required('Adres e-mail jest wymagany')
      .email('Wprowadź poprawny adres e-mail'),
  })
  .required();

export const ResetPasswordSchema = yup
  .object({
    password: yup
      .string()
      .required('Hasło jest wymagane')
      .matches(/^[\x00-\x7F]+$/, 'Dozwolone są tylko angielskie litery, cyfry i symbole')
      .test('password-validation', 'Hasło nie spełnia wymagań', isPasswordValid),
    passwordConfirm: yup
      .string()
      .required('Powtórz hasło')
      .oneOf([yup.ref('password')], 'Hasła muszą być identyczne'),
  })
  .required();
