import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import classNames from 'classnames';
import { PasswordRequirements } from '../ui/PasswordRequirements';
import { ResetPasswordSchema } from '../lib/formValidationRules';
import { ResetPassordInputs, ResetPasswordFormData } from '../types/FormTypes';
import { useLoading } from '@/hooks/useLoading';
import { resetPassword } from '../auth.api';

type FormProps = {
  className?: string;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  setExpired: React.Dispatch<React.SetStateAction<boolean>>;
  token: string;
};

export const ResetPasswordForm = ({ className, setSuccess, setExpired, token }: FormProps) => {
  const { loading, setLoading } = useLoading();

  const {
    register,
    setError,
    watch,
    formState: { errors },
    handleSubmit,
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(ResetPasswordSchema),
    reValidateMode: 'onChange',
    mode: 'onTouched',
    shouldFocusError: false,
  });

  const password = watch('password', '');

  const changePassword: SubmitHandler<ResetPassordInputs> = async ({ password }) => {
    setLoading(true);

    setError('root', {
      type: 'server',
      message: '',
    });

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (error) {
      const err = error as { status?: number; message?: string };
      const status = err.status;

      if (status === 400) {
        setExpired(true);
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
    <form
      noValidate
      onSubmit={handleSubmit(changePassword)}
      className={classNames('relative', className)}
    >
      <div className="flex flex-col gap-[10px]">
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />
      </div>

      <PasswordRequirements password={password} className="mt-[16px] mb-[24px]" />

      <Button loading={loading} type="submit" className="w-full">
        Zapisz nowe hasło
      </Button>
    </form>
  );
};
