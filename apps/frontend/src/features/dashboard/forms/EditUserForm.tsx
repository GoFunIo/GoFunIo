import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { UserManagementSchema, UserManagementFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { Select } from '../ui/Select';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { UserFormData, UserType } from '../types/UserTypes';
import { FormError } from '@/features/auth/ui/FormError';
import { useChangeTeamMember } from '../hooks/team.hooks';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useUser } from '../hooks/user.hooks';
import { usePermissions } from '../hooks/usePermissions';
import classNames from 'classnames';

type Props = {
  onClose: () => void;
  initialData: UserType;
};

const roleOptions = [
  { id: 0, value: 'OWNER', label: 'Owner', disabled: true },
  { id: 1, value: 'ADMIN', label: 'Admin' },
  { id: 2, value: 'MANAGER', label: 'Menedżer floty' },
];

export const EditUserForm = ({ onClose, initialData }: Props) => {
  const { canChangeRole } = usePermissions();
  const { data: user } = useUser();
  const { mutateAsync: editMember } = useChangeTeamMember();

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
    try {
      await editMember({
        ...data,
        id: initialData?.id,
      });
      onClose();
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error),
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
          disabled={true}
        />
        <div
          className={classNames('flex flex-col gap-1 relative pb-2', {
            'opacity-50 pointer-events-none': !canChangeRole || user?.id === initialData.id,
          })}
        >
          <div className="flex justify-between items-center">
            <label className="text-[14px] text-content-secondary font-medium mb-[4px]">
              Rola *
            </label>
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
