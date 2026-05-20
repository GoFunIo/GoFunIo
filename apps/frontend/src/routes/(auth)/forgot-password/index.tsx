import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { SubmitHandler, useForm, UseFormRegisterReturn } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ChangeEvent } from 'react';
import { CheckEmail } from '@/features/auth/ui/CheckEmail';

export const Route = createFileRoute('/(auth)/forgot-password/')({
  component: RouteComponent,
});

type FormData = yup.InferType<typeof schema>;

type Inputs = {
  email: string;
};

const schema = yup
  .object({
    email: yup
      .string()
      .required('Adres e-mail jest wymagany')
      .email('Wprowadź poprawny adres e-mail'),
  })
  .required();

function RouteComponent() {
  const {
    register,
    setError,
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

  const handleInputChange =
    (field: keyof FormData, registerFn: UseFormRegisterReturn) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      clearErrors('root');
      clearErrors(field);
      registerFn.onChange(e);
    };

  const resetPassword: SubmitHandler<Inputs> = async () => {
    try {
      setSuccess(true);
    } catch {
      setError('root', {
        type: 'server',
        message: 'Konto o takim adresie e-mail nie istnieje',
      });
    }
  };

  if (success) {
    return (
      <CheckEmail
        title="Sprawdź swoją skrzynkę e-mail"
        subtitle="Wysłaliśmy link do zmiany hasła na Twój adres e-mail. Kliknij w link, aby zmienić hasło."
      />
    );
  }

  return (
    <AuthWrapper
      title="Nie pamiętasz hasła?"
      subtitle="Wprowadź swój e-mail, a wyślemy link do resetu hasła."
    >
      <form onSubmit={handleSubmit(resetPassword)} className="pt-[30px] relative">
        {errors.root?.message && (
          <p className="absolute top-[2px] w-full text-center text-[14px] font-medium text-alert">
            {errors.root.message}
          </p>
        )}
        <Input
          label="E-mail"
          placeholder="email@example.com"
          error={errors.email?.message}
          {...emailRegister}
          onChange={handleInputChange('email', emailRegister)}
        />
        <Button type="submit" className="mt-[30px] w-full">
          WYŚLIJ LINK RESETUJĄCY HASŁO
        </Button>
        <div className="flex justify-center gap-2 mt-[10px]">
          <p className="text-[14px] font-medium">Nie masz konta?</p>
          <Link to="/login" className="font-medium text-[14px] text-primary">
            Wróć do logowania
          </Link>
        </div>
      </form>
    </AuthWrapper>
  );
}
