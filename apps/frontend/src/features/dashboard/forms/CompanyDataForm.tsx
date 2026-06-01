import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { CompanyDataSchema } from '../lib/formValidationRules';
import { CompanyDataFormData, PersonalDataFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

type Props = {
  onClose: () => void;
  initialCompanyData?: CompanyDataFormData;
  personalData?: PersonalDataFormData;
};

export const CompanyDataForm = ({ onClose, initialCompanyData, personalData }: Props) => {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CompanyDataFormData>({
    resolver: yupResolver(CompanyDataSchema),
    defaultValues: initialCompanyData || {
      sameAsPersonal: false,
      companyName: '',
      nip: '',
      companyAddress: '',
      companyPostalCode: '',
      companyCity: '',
    },
  });

  const isSameAddress = useWatch({
    control,
    name: 'sameAsPersonal',
    defaultValue: false,
  });

  useEffect(() => {
    if (isSameAddress && personalData) {
      setValue('companyAddress', personalData.address, { shouldValidate: true });
      setValue('companyPostalCode', personalData.postalCode, { shouldValidate: true });
      setValue('companyCity', personalData.city, { shouldValidate: true });
    }
  }, [isSameAddress, personalData, setValue]);

  const onSubmit = async (data: CompanyDataFormData) => {
    try {
      console.log('Wysyłanie danych firmowych do bazy:', data);
      // await axios.patch('/api/profile/company', data);
      onClose();
    } catch (error) {
      console.error('Błąd zapisu danych firmowych:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="flex items-center gap-[8px] mb-[20px]">
        <input
          type="checkbox"
          id="sameAsPersonal"
          className="w-[18px] h-[18px] accent-primary cursor-pointer rounded"
          {...register('sameAsPersonal')}
        />
        <label
          htmlFor="sameAsPersonal"
          className="text-[14px] text-dark cursor-pointer select-none"
        >
          Dane adresowe firmy są takie same jak dane osobowe
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[16px] gap-y-[12px]">
        <Input
          label="Nazwa firmy"
          placeholder="Nazwa firmy"
          {...register('companyName')}
          error={errors.companyName?.message}
        />

        <Input
          label="NIP"
          placeholder="111-111-11-11"
          {...register('nip')}
          error={errors.nip?.message}
        />

        <div className="md:col-span-2">
          <Input
            label="Adres firmowy"
            placeholder="np. Prosta 1"
            {...register('companyAddress')}
            error={errors.companyAddress?.message}
            disabled={isSameAddress}
            className={isSameAddress ? 'opacity-60 bg-background-secondary' : ''}
          />
        </div>

        <Input
          label="Kod pocztowy"
          placeholder="00-000"
          {...register('companyPostalCode')}
          error={errors.companyPostalCode?.message}
          disabled={isSameAddress}
          className={isSameAddress ? 'opacity-60 bg-background-secondary' : ''}
        />

        <Input
          label="Miasto"
          placeholder="np. Warszawa"
          {...register('companyCity')}
          error={errors.companyCity?.message}
          disabled={isSameAddress}
          className={isSameAddress ? 'opacity-60 bg-background-secondary' : ''}
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
