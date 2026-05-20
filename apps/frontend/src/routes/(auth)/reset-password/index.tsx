import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute, Link } from '@tanstack/react-router';
import classNames from 'classnames';

import { SubmitHandler, useForm, UseFormRegisterReturn } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ChangeEvent } from 'react';

export const Route = createFileRoute('/(auth)/reset-password/')({
  component: RouteComponent,
});

type FormData = yup.InferType<typeof schema>;

type Inputs = {
  password: string;
  passwordConfirm: string;
};

const schema = yup
  .object({
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

function RouteComponent() {
  const {
    register,
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

  const changePassword: SubmitHandler<Inputs> = async () => {
    try {
    } catch {}
  };

  return (
    <AuthWrapper
      title="Ustaw nowe hasło"
      subtitle="Hasło musi mieć min. 8 znaków i zawierać wielką oraz małą literę, cyfrę i znak specjalny."
    >
      <form noValidate onSubmit={handleSubmit(changePassword)} className="mt-[30px] relative">
        <div className="flex flex-col gap-[10px]">
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
          Zapisz nowe hasło
        </Button>
        <div className="flex justify-center gap-2 mt-[10px]">
          <Link to="/login" className="font-medium text-[14px] text-primary">
            Wróć do logowania
          </Link>
        </div>
      </form>
    </AuthWrapper>
  );
}
