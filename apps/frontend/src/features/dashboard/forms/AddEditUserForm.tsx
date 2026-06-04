import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { UserManagementSchema, UserManagementFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { Select } from '../ui/Select';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { useEffect } from 'react';

type Props = {
  onClose: () => void;
  initialData?: Partial<UserManagementFormData> & { id?: string | number };
};

const roleOptions = [
  { id: 1, value: 'Użytkownik', label: 'Użytkownik' },
  { id: 2, value: 'Admin', label: 'Admin' },
  { id: 3, value: 'Menedżer', label: 'Menedżer floty' },
];

export const AddEditUserForm = ({ onClose, initialData }: Props) => {
  const isEditMode = !!initialData?.id;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserManagementFormData>({
    resolver: yupResolver(UserManagementSchema),
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      sendInvite: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        sendInvite: false,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: UserManagementFormData) => {
    try {
      if (isEditMode) {
        console.log(`Aktualizacja użytkownika o ID ${initialData?.id}:`, data);
      } else {
        console.log('Tworzenie nowego użytkownika:', data);
      }
      onClose();
    } catch (error) {
      console.error('Błąd podczas zapisu użytkownika:', error);
    }
  };

  const inputStyles = '!text-[14px] !placeholder:text-icon font-medium w-full';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-left">
      <div className="flex flex-col gap-y-4">
        <Input
          label="Imię"
          placeholder="Imię"
          className={inputStyles}
          {...register('firstName')}
          error={errors.firstName?.message}
        />

        <Input
          label="Nazwisko"
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
          disabled={isEditMode}
        />

        <div className="flex flex-col gap-1 relative pb-2">
          <div className="flex justify-between items-center">
            <label className="text-[14px] text-content-secondary mb-[4px]">Rola *</label>
            {errors.role?.message && (
              <p className="text-[12px] text-alert font-medium absolute right-0 top-0">
                {errors.role.message}
              </p>
            )}
          </div>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select
                options={roleOptions}
                clearOption={false}
                value={field.value ?? null}
                onChange={field.onChange}
                placeholder="Przypisz rolę"
                className="w-full !h-[45px]"
                error={errors.role?.message}
              />
            )}
          />
        </div>

        {!isEditMode && (
          <div className="flex items-center gap-[10px] p-[14px] border border-icon rounded-[7px] bg-background-secondary mt-2">
            <input
              type="checkbox"
              id="sendInvite"
              className="w-[18px] h-[18px] accent-primary cursor-pointer rounded"
              {...register('sendInvite')}
            />
            <label
              htmlFor="sendInvite"
              className="text-[14px] text-content-primary font-medium cursor-pointer select-none"
            >
              Wyślij zaproszenie e-mail
            </label>
          </div>
        )}
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
          {isSubmitting ? 'Zapisywanie...' : isEditMode ? 'Zapisz' : 'Utwórz użytkownika'}
        </BoardButton>
      </div>
    </form>
  );
};
