import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ChangeEmailSchema, ChangeEmailFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { useUser } from '@/hooks/useUser';
import { changeUserEmail } from '../api/profile.api';
import { useLoading } from '@/hooks/useLoading';
import { FormError } from '@/features/auth/ui/FormError';
import { useState } from 'react';
import { getImage } from '@/utils/getImage';

type Props = {
  onClose: () => void;
};

export const ChangeEmailForm = ({ onClose }: Props) => {
  const { data: user } = useUser();
  const { loading, setLoading } = useLoading();
  const [success, setSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailFormData>({
    resolver: yupResolver(ChangeEmailSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: '',
    },
  });

  const onSubmit = async (data: ChangeEmailFormData) => {
    try {
      await changeUserEmail(data);
      setSuccess(true);
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

  if (success) {
    return (
      <div className="w-full md:py-[70px] md:px-[50px] py-[20px] px-[20px]">
        <img src={getImage('email.svg')} alt="Email icon" className="m-auto mb-[20px]" />
        <h3 className="text-center pb-[16px]">Sprawdź swoją skrzynkę e-mail</h3>
        <p className="text-center">
          Wysłaliśmy link weryfikacyjny na Twój adres e-mail. Kliknij w link, aby zweryfikować swoje
          konto.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      {errors.root?.message && <FormError message={errors.root.message} />}
      <div className="text-[14px] mb-[24px] pb-[16px] border-b border-background-secondary">
        <span className="text-content-secondary">Aktualny adres e-mail: </span>
        <span className="font-semibold text-dark ml-[4px]">{user.email}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <Input
          label="Nowy e-mail *"
          placeholder="Nowy adres e-mail: mail@example.com"
          {...register('newEmail')}
          error={errors.newEmail?.message}
        />

        <Input
          type="password"
          label="Obecne hasło *"
          placeholder="* * * * * *"
          {...register('currentPassword')}
          error={errors.currentPassword?.message}
        />
      </div>

      <div className="flex justify-end gap-[12px]  mt-[28px] pt-[20px]">
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
