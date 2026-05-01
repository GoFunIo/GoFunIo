import { AuthWrapper } from '@/components/features/auth/AuthWrapper';
import { handleChange } from '@/components/features/auth/form';
import { FormProps } from '@/components/features/auth/types';
import { isFormEmpty, validateForm } from '@/components/features/auth/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: RouteComponent,
});

function RouteComponent() {
  const [form, setForm] = useState<FormProps>({
    email: '',
  });

  const [errors, setErrors] = useState<FormProps>({
    email: '',
  });

  const { currentErrors, isValid } = validateForm(form);

  const resetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors(currentErrors);

    if (!isValid) return;
  };

  return (
    <AuthWrapper
      title="Nie pamiętasz hasła?"
      subtitle="Wprowadź swój e-mail, a wyślemy link do resetu hasła."
    >
      <form noValidate onSubmit={resetPassword} className="mt-[30px]">
        <Input
          label="E-mail"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange(e, 'email', setForm, setErrors)}
          placeholder="email@example.com"
          className="mb-[30px]"
          error={errors.email}
        />
        <Button type="submit" disabled={isFormEmpty(form)} className="w-full">
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
