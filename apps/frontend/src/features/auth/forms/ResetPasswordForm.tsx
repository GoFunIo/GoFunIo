import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import classNames from 'classnames';
import { PasswordRequirements } from '../ui/PasswordRequirements';
import { ResetPasswordSchema } from '../lib/formValidationRules';
import { ResetPassordInputs, ResetPasswordFormData } from '../types/FormTypes';
import { useLoading } from '@/hooks/useLoading';

type FormProps = {
  className?: string;
};

export const ResetPasswordForm = ({ className }: FormProps) => {
  const { loading, setLoading } = useLoading();

  const {
    register,
    watch,
    formState: { errors },
    handleSubmit,
    clearErrors,
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(ResetPasswordSchema),
    reValidateMode: 'onSubmit',
    mode: 'onSubmit',
    shouldFocusError: false,
  });

  const password = watch('password', '');

  const changePassword: SubmitHandler<ResetPassordInputs> = async () => {
    setLoading(true);

    try {
    } catch {}

    setLoading(false);
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
          {...register('password', {
            onChange: () => {
              clearErrors('root');
              clearErrors('password');
            },
          })}
        />
        <Input
          type="password"
          label="Hasło"
          placeholder="• • • • • • • •"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm', {
            onChange: () => {
              clearErrors('root');
              clearErrors('passwordConfirm');
            },
          })}
        />
      </div>

      <PasswordRequirements password={password} className="mt-[16px] mb-[24px]" />

      <Button loading={loading} type="submit" className="w-full">
        Zapisz nowe hasło
      </Button>
    </form>
  );
};
