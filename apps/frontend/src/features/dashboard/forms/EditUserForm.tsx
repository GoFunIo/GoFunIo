import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { UserManagementSchema, UserManagementFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { Select } from '../ui/Select';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { changeTeamMember } from '../api/team.api';
import { useQueryClient } from '@tanstack/react-query';
import { UserFormData, UserType } from '../types/UserTypes';
import { FormError } from '@/features/auth/ui/FormError';

type Props = {
  onClose: () => void;
  initialData: UserType;
};

const roleOptions = [
  { id: 1, value: 'ADMIN', label: 'Admin' },
  { id: 2, value: 'MANAGER', label: 'Menedżer floty' },
];

export const EditUserForm = ({ onClose, initialData }: Props) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: yupResolver(UserManagementSchema),
    defaultValues: {
      firstName: initialData.firstName ?? '',
      lastName: initialData.lastName ?? '',
      email: initialData.email,
      role: initialData.role ?? '',
    },
  });

  const onSubmit = async (data: UserManagementFormData) => {
    setError('root', {
      type: 'server',
      message: '',
    });

    try {
      await changeTeamMember({ ...data, id: initialData?.id });
      await queryClient.invalidateQueries({
        queryKey: ['team'],
      });
      onClose();
    } catch (error) {
      const err = error as { status?: number; message?: string };

      if (err.status === 0) {
        setError('root', {
          type: 'network',
          message: 'Brak połączenia z internetem.',
        });
      } else if (err.status === 409) {
        setError('root', {
          type: 'network',
          message: 'Użytkownik z takim adresem już istnieje.',
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
          disabled={true}
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
