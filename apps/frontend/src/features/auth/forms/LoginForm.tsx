import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link, useNavigate } from '@tanstack/react-router';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { signIn } from '../auth.api';
import { useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import { LoginSchema } from '../lib/formValidationRules';
import { LoginFormData, LoginInputs } from '../types/FormTypes';

type FormProps = {
  className?: string;
};

export const LoginForm = ({ className }: FormProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    setError,
    reset,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: yupResolver(LoginSchema),
    reValidateMode: 'onSubmit',
    mode: 'onSubmit',
    shouldFocusError: false,
  });

  const login: SubmitHandler<LoginInputs> = async (data) => {
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
    <form onSubmit={handleSubmit(login)} className={classNames('relative', className)}>
      {errors.root?.message && (
        <p className="absolute top-[2px] w-full text-center text-[14px] font-medium text-alert">
          {errors.root.message}
        </p>
      )}
      <div className="flex flex-col gap-[10px]">
        <Input
          label="E-mail"
          placeholder="email@example.com"
          error={errors.email?.message}
          {...register('email', {
            onChange: () => {
              clearErrors('root');
              clearErrors('email');
            },
          })}
        />
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.password?.message}
          {...register('password', {
            onChange: () => {
              clearErrors('root');
              clearErrors('password');
            },
          })}
        />
      </div>
      <Link
        to="/forgot-password"
        className="ml-auto block w-fit my-[10px] font-medium text-[14px] text-primary"
      >
        Nie pamiętasz hasła?
      </Link>
      <Button type="submit" className="w-full">
        ZALOGUJ SIĘ
      </Button>
    </form>
  );
};
