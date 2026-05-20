import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { signUp } from '@/features/auth/auth.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';

import { SubmitHandler, useForm, UseFormRegisterReturn } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ChangeEvent } from 'react';
import classNames from 'classnames';
import { getImage } from '@/utils/getImage';

export const Route = createFileRoute('/(auth)/signup/')({
  component: Signup,
});

type FormData = yup.InferType<typeof schema>;

type Inputs = {
  email: string;
  password: string;
  passwordConfirm: string;
};

const schema = yup
  .object({
    email: yup
      .string()
      .required('Adres e-mail jest wymagany')
      .email('Wprowadź poprawny adres e-mail'),
    password: yup
      .string()
      .required('Hasło jest wymagane')
      .matches(/^[\x00-\x7F]+$/, 'Dozwolone są tylko angielskie litery, cyfry i symbole')
      .test('password-validation', 'Hasło nie spełnia wymagań', (value) => {
        if (!value) return false;

        const hasMinLength = value.length >= 8;
        const hasLowercase = /[a-z]/.test(value);
        const hasUppercase = /[A-Z]/.test(value);
        const hasNumber = /\d/.test(value);
        const hasSpecial = /[^A-Za-z0-9]/.test(value);

        return hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecial;
      }),
    passwordConfirm: yup
      .string()
      .required('Powtórz hasło')
      .oneOf([yup.ref('password')], 'Hasła muszą być identyczne'),
  })
  .required();

function Signup() {
  const navigate = useNavigate();

  const {
    register,
    setError,
    reset,
    watch,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    reValidateMode: 'onSubmit',
    mode: 'onSubmit',
    shouldFocusError: false,
  });

  const [success, setSuccess] = useState<boolean>(false);
  const emailRegister = register('email');
  const passwordRegister = register('password');
  const passwordConfirmRegister = register('passwordConfirm');
  const password = watch('password', '');

  const passwordRules = [
    {
      valid: password.length >= 8,
      text: 'Min. 8 znaków',
    },
    {
      valid: /\d/.test(password),
      text: 'Cyfra',
    },
    {
      valid: /[a-z]/.test(password),
      text: 'Mała litera',
    },
    {
      valid: /[^A-Za-z0-9]/.test(password),
      text: 'Znak specjalny',
    },
    {
      valid: /[A-Z]/.test(password),
      text: 'Wielka litera',
    },
    {
      valid: /^[\x00-\x7F]+$/.test(password),
      text: 'Tylko angielskie znaki',
    },
  ];

  const handleInputChange =
    (field: keyof FormData, registerFn: UseFormRegisterReturn) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      clearErrors('root');
      clearErrors(field);
      registerFn.onChange(e);
    };

  const createAccount: SubmitHandler<Inputs> = async (data) => {
    try {
      await signUp(data);
      setSuccess(true);
    } catch {
      reset({
        email: '',
        password: '',
        passwordConfirm: '',
      });

      setError('root', {
        type: 'server',
        message: 'Użytkownik z takim adresem e-mail już istnieje',
      });
    }
  };

  if (success) {
    return (
      <section className="px-[20px] bg-bg-section flex items-center justify-center h-full">
        <div className="bg-white max-w-[460px] w-full rounded-[15px] shadow-[0_4px_13px_0_rgba(0,0,0,0.2)] md:py-[70px] md:px-[50px] py-[50px] px-[30px]">
          <img src={getImage('email.svg')} alt="Email icon" className="m-auto mb-[20px]" />
          <h3 className="text-center pb-[16px]">Sprawdź swoją skrzynkę e-mail</h3>
          <p className="text-center">
            Wysłaliśmy link weryfikacyjny na Twój adres e-mail. Kliknij w link, aby zweryfikować
            swoje konto.
          </p>
          <Button onClick={() => navigate({ to: '/login' })} className="mt-[24px] w-full">
            POWRÓT DO LOGOWANIA
          </Button>
        </div>
      </section>
    );
  }

  return (
    <AuthWrapper title="Załóż darmowe konto" subtitle="Wypróbuj bezpłatnie przez 7 dni">
      <form onSubmit={handleSubmit(createAccount)} className="pt-[30px] relative">
        {errors.root?.message && (
          <p className="absolute top-[2px] w-full text-center text-[14px] font-medium text-alert">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-col gap-[10px]">
          <Input
            label="E-mail"
            placeholder="email@example.com"
            error={errors.email?.message}
            {...emailRegister}
            onChange={handleInputChange('email', emailRegister)}
          />
          <Input
            type="password"
            label="Hasło"
            placeholder="• • • • • • • •"
            error={errors.password?.message}
            {...passwordRegister}
            onChange={handleInputChange('password', passwordRegister)}
          />
          <Input
            type="password"
            label="Hasło"
            placeholder="• • • • • • • •"
            error={errors.passwordConfirm?.message}
            {...passwordConfirmRegister}
            onChange={handleInputChange('passwordConfirm', passwordConfirmRegister)}
          />
        </div>

        <div className="mt-[16px] mb-[24px] w-fit grid grid-cols-2 gap-y-[4px] gap-x-[40px]">
          {passwordRules.map((item) => {
            return (
              <div key={item.text} className="flex items-center gap-[4px]">
                <div
                  className={classNames(
                    'rounded-full h-[10px] w-[10px]',
                    item.valid ? 'bg-success' : 'bg-icon',
                  )}
                ></div>
                <p className="text-[12px] font-medium text-icon">{item.text}</p>
              </div>
            );
          })}
        </div>

        <Button type="submit" className="w-full">
          Załóż konto
        </Button>
        <div className="flex justify-center gap-2 mt-[10px]">
          <p className="text-[14px] font-medium">Masz już konto?</p>
          <Link to="/login" className="font-medium text-[14px] text-primary">
            Zaloguj się
          </Link>
        </div>
      </form>
    </AuthWrapper>
  );
}
