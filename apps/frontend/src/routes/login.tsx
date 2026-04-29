import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getUser, signIn } from 'src/api/auth';
import { AuthWrapper } from 'src/components/features/auth/AuthWrapper';
import { handleChange } from 'src/components/features/auth/form';
import { FormProps } from 'src/components/features/auth/types';
import { isFormEmpty, validateForm } from 'src/components/features/auth/validation';
import { Button } from 'src/components/ui/Button';
import { Input } from 'src/components/ui/Input';
import { queryClient } from 'src/lib/queryClient';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: ['me'],
      queryFn: getUser,
    });

    if (user) {
      throw redirect({
        to: '/userdashboard',
      });
    }
  },
  component: Login,
});

function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormProps>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormProps>({
    email: '',
    password: '',
  });
  const { currentErrors, isValid } = validateForm(form);

  const logIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors(currentErrors);

    if (!isValid) return;

    try {
      const user = await signIn(form);
      queryClient.setQueryData(['me'], user);
      navigate({ to: '/userdashboard' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieprawidłowe dane uwierzytelniające';
      setErrors({
        ...errors,
        email: message,
      });
    }
  };

  return (
    <AuthWrapper title="Witaj ponownie" subtitle="Zaloguj się do swojego konta">
      <form noValidate onSubmit={logIn} className="mt-[30px]">
        <Input
          label="E-mail"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange(e, 'email', setForm, setErrors)}
          placeholder="email@example.com"
          className="mb-[10px]"
          error={errors.email}
        />
        <Input
          label="Hasło"
          name="password"
          type="password"
          value={form.password}
          onChange={(e) => handleChange(e, 'password', setForm, setErrors)}
          placeholder="• • • • • • • •"
          error={errors.password}
        />
        <Link
          to="/forgot-password"
          className="ml-auto block w-fit my-[10px] font-medium text-[14px] text-primary"
        >
          Nie pamiętasz hasła?
        </Link>
        <Button type="submit" disabled={isFormEmpty(form)} className="w-full">
          ZALOGUJ SIĘ
        </Button>
        <div className="flex justify-center gap-2 mt-[10px]">
          <p className="text-[14px] font-medium">Nie masz konta?</p>
          <Link to="/signup" className="font-medium text-[14px] text-primary">
            Zarejestruj się
          </Link>
        </div>
      </form>
    </AuthWrapper>
  );
}
