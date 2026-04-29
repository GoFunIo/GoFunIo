import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthWrapper } from 'src/components/features/auth/AuthWrapper';
import { handleChange } from 'src/components/features/auth/form';
import { FormProps } from 'src/components/features/auth/types';
import { isFormEmpty, validateForm } from 'src/components/features/auth/validation';
import { Button } from 'src/components/ui/Button';
import { Input } from 'src/components/ui/Input';

export const Route = createFileRoute('/reset-password')({
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
