import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { signUp } from '@/features/auth/auth.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { isFormEmpty, validateForm } from '@/features/auth/lib/validation';
import { FormProps } from '@/features/auth/types/types';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { handleChange } from '@/features/auth/lib/form';

export const Route = createFileRoute('/(auth)/signup/')({
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
          <p className="text-[14px] font-medium">Masz już konto?</p>
          <Link to="/login" className="font-medium text-[14px] text-primary">
            Zaloguj się
          </Link>
        </div>
      </form>
    </AuthWrapper>
  );
}
