import { getUser } from '@/api/auth';
import { AuthWrapper } from '@/components/features/auth/AuthWrapper';
import { handleChange } from '@/components/features/auth/form';
import { FormProps } from '@/components/features/auth/types';
import { isFormEmpty, validateForm } from '@/components/features/auth/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { queryClient } from '@/lib/queryClient';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/reset-password')({
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: ['me'],
      queryFn: getUser,
    });

    if (!user) {
      throw redirect({
        to: '/login',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [form, setForm] = useState<FormProps>({
    password: '',
    submitPassword: '',
  });

  const [errors, setErrors] = useState<FormProps>({
    password: '',
    submitPassword: '',
  });
  const { currentErrors, isValid } = validateForm(form);

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors(currentErrors);

    if (!isValid) return;
  };

  return (
    <AuthWrapper title="Ustaw nowe hasło" subtitle="Wybierz silne, unikalne hasło">
      <form noValidate onSubmit={changePassword} className="mt-[30px]">
        <Input
          label="Nowe hasło"
          name="password"
          type="password"
          value={form.password}
          onChange={(e) => handleChange(e, 'password', setForm, setErrors)}
          placeholder="Wpisz nowe hasło (min 8  znaków)"
          className="mb-[10px]"
          error={errors.password}
        />
        <Input
          label="Powtórz hasło"
          name="password"
          type="password"
          value={form.submitPassword}
          onChange={(e) => handleChange(e, 'submitPassword', setForm, setErrors)}
          placeholder="Powtórz nowe hasło"
          className="mb-[30px]"
          error={errors.submitPassword}
        />
        <Button type="submit" disabled={isFormEmpty(form)} className="w-full">
          Zapisz nowe hasło
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
