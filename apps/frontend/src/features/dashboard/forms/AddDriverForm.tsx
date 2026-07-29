import { useForm } from 'react-hook-form';
import { DriverManagementSchema } from '../lib/formValidationRules';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import { FormError } from '@/features/auth/ui/FormError';
import { DriverFormData } from '../types/DriverTypes';
import { handlePhoneInput } from '@/utils/handlePhoneInput';
import { useAddDriver } from '../hooks/drivers.hooks';

type Props = {
  onClose: () => void;
};

export const AddDriverForm = ({ onClose }: Props) => {
  const { mutateAsync: addDriver } = useAddDriver();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormData>({
    resolver: yupResolver(DriverManagementSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  const onSubmit = async (data: DriverFormData) => {
    setError('root', {
      type: 'server',
      message: '',
    });

    try {
      await addDriver(data);
      onClose();
    } catch (error) {
      const err = error as { status?: number; message?: string };

      if (err.status === 0) {
        setError('root', {
          type: 'network',
          message: 'Brak połączenia z internetem.',
        });
      } else {
        setError('root', {
          type: 'server',
          message: 'Błąd serwera. Spróbuj ponownie później.',
        });
      }
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
          {...register('phone', {
            onChange: (e) => {
              e.target.value = handlePhoneInput(e.target.value);
            },
          })}
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
          Utwórz kierowcę
        </BoardButton>
      </div>
    </form>
  );
};
