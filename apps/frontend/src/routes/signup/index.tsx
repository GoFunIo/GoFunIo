import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getUser, signUp } from 'src/api/auth';
import { Button } from 'src/components/ui/Button';
import { Input } from 'src/components/ui/Input';
import { queryClient } from 'src/lib/queryClient';
import { AuthWrapper } from 'src/components/features/auth/AuthWrapper';
import { FormProps } from 'src/components/features/auth/types';
import { isFormEmpty, validateForm } from 'src/components/features/auth/validation';
import { handleChange } from 'src/components/features/auth/form';

export const Route = createFileRoute('/signup/')({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: ['me'],
      queryFn: getUser,
    });

    if (user) {
      throw redirect({
        to: '/dashboard',
      });
    }
  },

  component: Signup,
});

function Signup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormProps>({
    name: '',
    surname: '',
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormProps>({
    name: '',
    surname: '',
    email: '',
    password: '',
  });
  const { currentErrors, isValid } = validateForm(form);

  const createAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors(currentErrors);

    if (!isValid) return;

    try {
      const user = await signUp(form);
      queryClient.setQueryData(['me'], user);
      navigate({ to: '/signup/success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieprawidłowe dane uwierzytelniające';

      setErrors({
        ...errors,
        email: message,
      });
    }
  };

  return (
    <AuthWrapper title="Załóż darmowe konto" subtitle="Wypróbuj bezpłatnie przez 7 dni">
      <form noValidate onSubmit={createAccount} className="mt-[30px]">
        <Input
          label="Imię"
          name="name"
          value={form.name}
          onChange={(e) => handleChange(e, 'name', setForm, setErrors)}
          placeholder="Imię"
          className="mb-[10px]"
          error={errors.name}
        />
        <Input
          label="Nazwisko"
          name="surname"
          value={form.surname}
          onChange={(e) => handleChange(e, 'surname', setForm, setErrors)}
          placeholder="Nazwisko"
          className="mb-[10px]"
          error={errors.surname}
        />
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
          className="mb-[30px]"
          error={errors.password}
        />
        <Button type="submit" disabled={isFormEmpty(form)} className="w-full">
          Załóż konto
        </Button>
        <div className="flex justify-center gap-2 mt-[10px]">
          <p className="text-[14px] font-medium">Masz juz konto?</p>
          <Link to="/login" className="font-medium text-[14px] text-primary">
            Zaloguj się
          </Link>
        </div>
      </form>
    </AuthWrapper>
  );
}
