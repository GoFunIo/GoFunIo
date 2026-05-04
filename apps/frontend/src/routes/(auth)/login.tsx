import { signIn } from '@/api/auth';
import { AuthWrapper } from '@/components/features/auth/AuthWrapper';
import { handleChange } from '@/components/features/auth/form';
import { FormProps } from '@/components/features/auth/types';
import { isFormEmpty, validateForm } from '@/components/features/auth/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/(auth)/login')({
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
      navigate({ to: '/dashboard' });
    } catch {
      setErrors({
        ...errors,
        email: 'Nieprawidłowe dane uwierzytelniające',
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
