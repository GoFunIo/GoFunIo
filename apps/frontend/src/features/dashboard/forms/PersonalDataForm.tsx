import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { PersonalDataSchema } from '../lib/formValidationRules';
import { PersonalDataFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { changeUserSettings } from '../api/profile.api';
import { useQueryClient } from '@tanstack/react-query';
import { useLoading } from '@/hooks/useLoading';
import { FormError } from '@/features/auth/ui/FormError';
import { formatPostalCode } from '@/utils/formatPostalCode';
import { useUser } from '@/hooks/useUser';
import { handlePhoneInput } from '@/utils/handlePhoneInput';

type Props = {
  onClose: () => void;
};

export const PersonalDataForm = ({ onClose }: Props) => {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { loading, setLoading } = useLoading();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PersonalDataFormData>({
    resolver: yupResolver(PersonalDataSchema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      address: user.address ?? '',
      city: user.city ?? '',
      postalCode: user.postalCode ?? '',
    },
  });

  const onSubmit = async (data: PersonalDataFormData) => {
    setLoading(true);
    setError('root', {
      type: 'server',
      message: '',
    });

    try {
      const user = await changeUserSettings(data);
      queryClient.setQueryData(['me'], user);
      onClose();
    } catch (error) {
      const err = error as { status?: number; message?: string };

      if (err.status === 0) {
        setError('root', {
          type: 'network',
          message: 'Brak połączenia z internetem.',
        });
        return;
      }

      setError('root', {
        type: 'server',
        message: 'Błąd serwera. Spróbuj ponownie później.',
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    '!text-[14px] !placeholder:text-[12px] !placeholder:text-icon w-full font-normal';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      {errors.root?.message && <FormError message={errors.root.message} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[16px] gap-y-[12px]">
        <Input
          label="Imię"
          placeholder="Twoje Imię"
          className={inputStyles}
          {...register('firstName')}
          error={errors.firstName?.message}
        />

        <Input
          label="Nazwisko"
          placeholder="Twoje nazwisko"
          className={inputStyles}
          {...register('lastName')}
          error={errors.lastName?.message}
        />

        {/* E-mail  jest zablokowany/pokazany, zmiana maila jest w osobnym modalu */}
        <div className="opacity-60 pointer-events-none">
          <Input label="E-mail" value={user.email} disabled className="text-icon" />
        </div>

        <Input
          type="tel"
          label="Telefon"
          placeholder="+48 100-200-300"
          className={inputStyles}
          {...register('phone', {
            onChange: (e) => {
              e.target.value = handlePhoneInput(e.target.value);
            },
          })}
          error={errors.phone?.message}
        />

        <div className="md:col-span-2">
          <Input
            label="Adres"
            placeholder="Wpisz ulicę i numer domu"
            className={inputStyles}
            {...register('address')}
            error={errors.address?.message}
          />
        </div>

        <Input
          label="Kod pocztowy"
          placeholder="00-000"
          className={inputStyles}
          {...register('postalCode')}
          error={errors.postalCode?.message}
          maxLength={6}
          onChange={(e) => {
            e.target.value = formatPostalCode(e.target.value);
          }}
        />

        <Input
          label="Miasto"
          placeholder="Wpisz miasto"
          className={inputStyles}
          {...register('city')}
          error={errors.city?.message}
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
