import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ChangePasswordSchema, ChangePasswordFormData } from '../lib/formValidationRules';
import { getPasswordRulesState } from '@/features/auth/lib/passwordRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import classNames from 'classnames';
import { changeUserPassword } from '../api/profile.api';
import { useLoading } from '@/hooks/useLoading';
import { FormError } from '@/features/auth/ui/FormError';

type Props = {
  onClose: () => void;
};

export const ChangePasswordForm = ({ onClose }: Props) => {
  const { loading, setLoading } = useLoading();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword', '');

  const rulesState = getPasswordRulesState(newPasswordValue);

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      await changeUserPassword(data);
      onClose();
    } catch (error) {
      const err = error as { status?: number; message?: string };
      const status = err.status;

      if (status === 401) {
        if (err.message === 'Invalid current password') {
          setError('root', {
            type: 'network',
            message: 'Nieprawidłowe obecne hasło.',
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

  const inputStyles = '!text-[14px] !placeholder:text-icon font-medium w-full';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      {errors.root?.message && <FormError message={errors.root.message} />}
      <div className="mb-[24px]">
        <p className="font-bold text-[14px] text-content-primary mb-[12px]">
          Potwierdź swoje obecne hasło
        </p>
        <div className="max-w-[400px]">
          <Input
            type="password"
            label="Obecne hasło *"
            placeholder="Obecne hasło"
            className={inputStyles}
            {...register('currentPassword')}
            error={errors.currentPassword?.message}
          />
        </div>
      </div>

      <div className="border-t border-background-secondary my-[20px]" />

      <div>
        <p className="font-bold text-[14px] text-content-primary mb-[12px]">Wprowadź nowe hasło</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <Input
            type="password"
            label="Nowe hasło *"
            placeholder="Nowe hasło"
            className={inputStyles}
            {...register('newPassword')}
            error={errors.newPassword?.message}
          />

          <Input
            type="password"
            label="Powtórz nowe hasło *"
            placeholder="Powtórz nowe hasło"
            className={inputStyles}
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
        </div>

        <div className="mt-[16px] p-[16px] bg-background-secondary rounded-[7px]">
          <p className="text-[12px] font-bold text-content-secondary mb-[10px]">
            Hasło musi zawierać:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-[12px] gap-y-[8px]">
            {rulesState.map((rule, index) => (
              <div key={index} className="flex items-center gap-[6px]">
                <span
                  className={classNames(
                    'w-[6px] h-[6px] rounded-full custom-transition',
                    rule.valid ? 'bg-success' : 'bg-icon',
                  )}
                />
                <span
                  className={classNames(
                    'text-[12px] font-medium custom-transition',
                    rule.valid ? 'text-success font-semibold' : 'text-content-secondary',
                  )}
                >
                  {rule.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-[12px] mt-[28px] pt-[20px]">
        <BoardButton
          type="button"
          variant="outline"
          size="medium"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Anuluj
        </BoardButton>
        <BoardButton type="submit" size="medium" loading={loading}>
          Zapisz
        </BoardButton>
      </div>
    </form>
  );
};
