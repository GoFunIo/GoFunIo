import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link } from '@tanstack/react-router';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { signIn } from '../auth.api';
import { useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import { LoginSchema } from '../lib/formValidationRules';
import { LoginFormData, LoginInputs } from '../types/FormTypes';
import { useLoading } from '@/hooks/useLoading';
import { FormError } from '../ui/FormError';

type FormProps = {
  className?: string;
  invitationToken?: string;
};

export const LoginForm = ({ className, invitationToken }: FormProps) => {
  const queryClient = useQueryClient();
  const { loading, setLoading } = useLoading();

  const {
    register,
    setError,
    formState: { errors },
    handleSubmit,
  } = useForm<LoginFormData>({
    resolver: yupResolver(LoginSchema),
    reValidateMode: 'onChange',
    mode: 'onTouched',
    shouldFocusError: false,
  });

  const login: SubmitHandler<LoginInputs> = async (data) => {
    setLoading(true);

    setError('root', {
      type: 'server',
      message: '',
    });

    try {
      const user = await signIn(data);
      queryClient.setQueryData(['me'], user);
      window.location.assign(
        invitationToken
          ? `/accept-invitation?token=${encodeURIComponent(invitationToken)}`
          : '/dashboard',
      );
    } catch (error) {
      const err = error as { status?: number; message?: string };
      const status = err.status;

      if (status === 401 || status === 403) {
        if (err.message === 'Email not verified') {
          setError('root', {
            type: 'server',
            message: 'Twoje konto nie zostało zweryfikowane',
          });
        } else {
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
      } else {
        setError('root', {
          type: 'server',
          message: 'Błąd serwera. Spróbuj ponownie później.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(login)} className={classNames('relative', className)}>
      {errors.root?.message && <FormError message={errors.root.message} />}
      <div className="flex flex-col gap-[10px]">
        <Input
          label="E-mail"
          placeholder="email@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>
      <Link
        to="/forgot-password"
        className="ml-auto block w-fit my-[10px] font-medium text-[14px] text-primary"
      >
        Nie pamiętasz hasła?
      </Link>
      <Button loading={loading} type="submit" className="w-full">
        ZALOGUJ SIĘ
      </Button>
    </form>
  );
};
