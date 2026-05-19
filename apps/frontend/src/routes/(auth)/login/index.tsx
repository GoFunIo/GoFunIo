import { signIn } from '@/features/auth/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { handleChange } from '@/features/auth/lib/form';
import { isFormEmpty, validateForm } from '@/features/auth/lib/validation';
import { FormProps } from '@/features/auth/types/types';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getImage } from '@/utils/getImage';

export const Route = createFileRoute('/(auth)/login/')({
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
      <button className="cursor-pointer my-[30px] flex items-center justify-center gap-[16px] h-[45px] w-full bg-bg-section rounded-[7px] border border-icon">
        <img src={getImage('google.svg')} alt="Google icon" className="" />
        <p className="text-[14px] font-medium text-content-muted">Zaloguj się przez Google</p>
      </button>

      <div
        className="flex items-center gap-[30px] text-gray-500
         before:h-[2px] before:flex-1 before:bg-icon
         after:h-[2px] after:flex-1 after:bg-icon"
      >
        <span className="text-[14px] font-medium text-content-muted">lub</span>
      </div>

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
