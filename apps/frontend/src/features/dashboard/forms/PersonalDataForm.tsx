import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { PersonalDataSchema } from '../lib/formValidationRules';
import { PersonalDataFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

type Props = {
  onClose: () => void;
  initialData?: PersonalDataFormData;
};

export const PersonalDataForm = ({ onClose, initialData }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonalDataFormData>({
    resolver: yupResolver(PersonalDataSchema),
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      postalCode: '',
      city: '',
    },
  });

  const onSubmit = async (data: PersonalDataFormData) => {
    try {
      console.log('Wysyłanie danych osobowych do bazy Sylwka:', data);
      // await axios.patch('/api/profile/personal', data);
      onClose();
    } catch (error) {
      console.error('Błąd zapisu danych osobowych:', error);
    }
  };

  const formatPostalCode = (value: string): string => {
    const digits = value.replace(/\D/g, '');

    if (digits.length > 2) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
    }

    return digits;
  };

  const inputStyles =
    '!text-[14px] !placeholder:text-[12px] !placeholder:text-icon w-full font-normal';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
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
          <Input
            label="E-mail"
            value={initialData?.firstName ? 'admin@gmail.com' : 'Wczytywanie...'}
            disabled
            className="text-icon"
          />
        </div>

        <Input
          label="Telefon"
          placeholder="+48 100-200-300"
          className={inputStyles}
          {...register('phone')}
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
        <BoardButton type="submit" size="medium" disabled={isSubmitting}>
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
        </BoardButton>
      </div>
    </form>
  );
};
