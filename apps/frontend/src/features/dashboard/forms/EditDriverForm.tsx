import { DriverFormData, DriverType } from '../types/DriverTypes';
import { useForm } from 'react-hook-form';
import { DriverManagementSchema } from '../lib/formValidationRules';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/ui/Input';
import { FormError } from '@/features/auth/ui/FormError';
import { BoardButton } from '../ui/BoardButton';
import { useChangeDriver } from '../hooks/drivers.hooks';
import { getErrorMessage } from '@/utils/getErrorMessage';

type Props = {
  onClose: () => void;
  initialData: DriverType;
};

export const EditDriverForm = ({ onClose, initialData }: Props) => {
  const { mutateAsync: editDriver } = useChangeDriver();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormData>({
    resolver: yupResolver(DriverManagementSchema),
    defaultValues: {
      firstName: initialData.firstName ?? '',
      lastName: initialData.lastName ?? '',
      email: initialData.email ?? '',
      phone: initialData.phone ?? '',
      notes: initialData.notes ?? '',
    },
  });

  const onSubmit = async (data: DriverFormData) => {
    try {
      await editDriver({
        ...data,
        id: initialData?.id,
      });
      onClose();
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, {
          404: 'Nie znaleziono kierowcy.',
        }),
      });
    }
  };

  const inputStyles = '!text-[14px] !placeholder:text-icon font-medium w-full';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-left">
      {errors.root?.message && <FormError message={errors.root.message} />}
      <div className="flex flex-col gap-y-4">
        <Input
          label="Imię *"
          placeholder="Imię"
          className={inputStyles}
          {...register('firstName')}
          error={errors.firstName?.message}
        />

        <Input
          label="Nazwisko *"
          placeholder="Nazwisko"
          className={inputStyles}
          {...register('lastName')}
          error={errors.lastName?.message}
        />

        <Input
          label="Adres e-mail *"
          placeholder="mail@example.com"
          className={inputStyles}
          {...register('email')}
          error={errors.email?.message}
        />

        <Input
          label="Numer telefonu *"
          placeholder="000 000 000"
          className={inputStyles}
          {...register('phone')}
          error={errors.phone?.message}
        />

        <Input
          label="Notatki"
          placeholder="Np. kierowca międzynarodowy"
          className={inputStyles}
          {...register('notes')}
          error={errors.notes?.message}
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
        <BoardButton type="submit" size="medium" loading={isSubmitting} disabled={isSubmitting}>
          Zapisz
        </BoardButton>
      </div>
    </form>
  );
};
