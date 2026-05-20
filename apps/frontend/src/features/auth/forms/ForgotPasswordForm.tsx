import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import classNames from 'classnames';
import { ForgotPasswordSchema } from '../lib/formValidationRules';
import { ForgotPasswordFormData, ForgotPasswordInputs } from '../types/FormTypes';
import { useLoading } from '@/hooks/useLoading';

type FormProps = {
  className?: string;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

export const ForgotPasswordForm = ({ className, setSuccess }: FormProps) => {
  const { loading, setLoading } = useLoading();

  const {
    register,
    setError,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(ForgotPasswordSchema),
    reValidateMode: 'onSubmit',
    mode: 'onSubmit',
    shouldFocusError: false,
  });

  const resetPassword: SubmitHandler<ForgotPasswordInputs> = async () => {
    setLoading(true);

    try {
      setSuccess(true);
    } catch {
      setError('root', {
        type: 'server',
        message: 'Konto o takim adresie e-mail nie istnieje',
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(resetPassword)} className={classNames('relative', className)}>
      {errors.root?.message && (
        <p className="absolute top-[2px] w-full text-center text-[14px] font-medium text-alert">
          {errors.root.message}
        </p>
      )}
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
      <Button loading={loading} type="submit" className="mt-[30px] w-full">
        WYŚLIJ LINK RESETUJĄCY HASŁO
      </Button>
    </form>
  );
};
