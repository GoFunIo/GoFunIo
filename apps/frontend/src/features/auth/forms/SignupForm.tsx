import { signUp } from '@/features/auth/auth.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import classNames from 'classnames';
import { PasswordRequirements } from '../ui/PasswordRequirements';
import { SignupSchema } from '../lib/formValidationRules';
import { SignupFormData, SignupInputs } from '../types/FormTypes';
import { useLoading } from '@/hooks/useLoading';

type FormProps = {
  className?: string;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

export const SignupForm = ({ className, setSuccess }: FormProps) => {
  const { loading, setLoading } = useLoading();

  const {
    register,
    setError,
    watch,
    formState: { errors },
    handleSubmit,
  } = useForm<SignupFormData>({
    resolver: yupResolver(SignupSchema),
    reValidateMode: 'onChange',
    mode: 'onTouched',
    shouldFocusError: false,
  });

  const password = watch('password', '');

  const createAccount: SubmitHandler<SignupInputs> = async (data) => {
    setLoading(true);

    setError('root', {
      type: 'server',
      message: '',
    });

    try {
      await signUp(data);
      setSuccess(true);
    } catch (error) {
      const err = error as { status?: number; message?: string };
      const status = err.status;

      if (status === 400) {
        setError('root', {
          type: 'server',
          message: 'Użytkownik z takim adresem e-mail już istnieje',
        });
        setError('email', {
          type: 'server',
          message: 'Ten adres e-mail jest już zarejestrowany',
        });
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
    <form onSubmit={handleSubmit(createAccount)} className={classNames('relative', className)}>
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
          {...register('email')}
          // {...register('email', {
          //   onChange: () => {
          //     clearErrors('root');
          //     clearErrors('email');
          //   },
          // })}
        />
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.password?.message}
          {...register('password')}
          // {...register('password', {
          //   onChange: () => {
          //     clearErrors('root');
          //     clearErrors('password');
          //   },
          // })}
        />
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
          // {...register('passwordConfirm', {
          //   onChange: () => {
          //     clearErrors('root');
          //     clearErrors('passwordConfirm');
          //   },
          // })}
        />
      </div>

      <PasswordRequirements password={password} className="mt-[16px] mb-[24px]" />

      <Button loading={loading} type="submit" className="w-full">
        Załóż konto
      </Button>
    </form>
  );
};
