import { signIn } from '@/features/auth/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { getImage } from '@/utils/getImage';

import { SubmitHandler, useForm, UseFormRegisterReturn } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ChangeEvent } from 'react';

type FormData = yup.InferType<typeof schema>;

type Inputs = {
  email: string;
  password: string;
};

const schema = yup
  .object({
    email: yup
      .string()
      .required('Adres e-mail jest wymagany')
      .email('Wprowadź poprawny adres e-mail'),
    password: yup.string().required('Hasło jest wymagane'),
  })
  .required();

export const Route = createFileRoute('/(auth)/login/')({
  component: Login,
});

function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    setError,
    reset,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    reValidateMode: 'onSubmit',
    mode: 'onSubmit',
    shouldFocusError: false,
  });

  const emailRegister = register('email');
  const passwordRegister = register('password');

  const handleInputChange =
    (field: keyof FormData, registerFn: UseFormRegisterReturn) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      clearErrors('root');
      clearErrors(field);
      registerFn.onChange(e);
    };

  const login: SubmitHandler<Inputs> = async (data) => {
    try {
      const user = await signIn(data);
      queryClient.setQueryData(['me'], user);
      navigate({ to: '/dashboard' });
    } catch {
      reset({
        email: '',
        password: '',
      });

      setError('email', {
        type: 'server',
        message: 'Nieprawidłowy email lub hasło',
      });

      setError('password', {
        type: 'server',
        message: 'Nieprawidłowy email lub hasło',
      });

      setError('root', {
        type: 'server',
        message: 'Podane dane logowania są nieprawidłowe',
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

      <form onSubmit={handleSubmit(login)} className="pt-[30px] relative">
        {errors.root?.message && (
          <p className="absolute top-[2px] w-full text-center text-[14px] font-medium text-alert">
            Podane dane logowania są nieprawidłowe
          </p>
        )}
        <Input
          label="E-mail"
          placeholder="email@example.com"
          className="mb-[10px]"
          error={errors.email?.message}
          {...emailRegister}
          onChange={handleInputChange('email', emailRegister)}
        />
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.password?.message}
          {...passwordRegister}
          onChange={handleInputChange('password', emailRegister)}
        />
        <Link
          to="/forgot-password"
          className="ml-auto block w-fit my-[10px] font-medium text-[14px] text-primary"
        >
          Nie pamiętasz hasła?
        </Link>
        <Button type="submit" className="w-full">
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
