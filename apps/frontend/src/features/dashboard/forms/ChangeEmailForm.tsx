import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ChangeEmailSchema, ChangeEmailFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

type Props = {
  onClose: () => void;
  currentEmail: string;
};

export const ChangeEmailForm = ({ onClose, currentEmail }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailFormData>({
    resolver: yupResolver(ChangeEmailSchema),
    defaultValues: {
      newEmail: '',
      confirmEmail: '',
    },
  });

  const onSubmit = async (data: ChangeEmailFormData) => {
    try {
      console.log('Wysyłanie prośby o zmianę maila do bazy Sylwka:', data);
      // await axios.patch('/api/profile/change-email', { email: data.newEmail });
      onClose();
    } catch (error) {
      console.error('Błąd podczas zmiany adresu e-mail:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="text-[14px] mb-[24px] pb-[16px] border-b border-background-secondary">
        <span className="text-content-secondary">Aktualny adres e-mail: </span>
        <span className="font-semibold text-dark ml-[4px]">{currentEmail}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <Input
          label="Nowy e-mail *"
          placeholder="Nowy adres e-mail: mail@example.com"
          {...register('newEmail')}
          error={errors.newEmail?.message}
        />

        <Input
          label="Powtórz e-mail *"
          placeholder="Nowy adres e-mail: mail@example.com"
          {...register('confirmEmail')}
          error={errors.confirmEmail?.message}
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
        <BoardButton type="submit" size="medium" disabled={isSubmitting}>
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
        </BoardButton>
      </div>
    </form>
  );
};
