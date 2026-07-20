import { useEffect } from 'react';
import { Resolver, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { CompanyDataSchema } from '../lib/formValidationRules';
import { CompanyDataFormData } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { formatNIP } from '@/utils/formatNIP';
import { formatPostalCode } from '@/utils/formatPostalCode';
import { useCompany } from '@/hooks/useCompany';
import { changeCompanyInfo } from '../api/company.api';
import { useQueryClient } from '@tanstack/react-query';
import { useLoading } from '@/hooks/useLoading';
import { useUser } from '@/hooks/useUser';
import { FormError } from '@/features/auth/ui/FormError';

type Props = {
  onClose: () => void;
};

export const CompanyDataForm = ({ onClose }: Props) => {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const { data: user } = useUser();
  const { loading, setLoading } = useLoading();

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyDataFormData>({
    resolver: yupResolver(CompanyDataSchema) as unknown as Resolver<CompanyDataFormData>,
    defaultValues: {
      name: company.name ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      nip: company.taxId ?? '',
      address: company.address ?? '',
      postalCode: company.postalCode ?? '',
      city: company.city ?? '',
    },
  });

  const isSameAddress = useWatch({
    control,
    name: 'sameAsPersonal',
    defaultValue: false,
  });

  useEffect(() => {
    if (isSameAddress && user) {
      setValue('address', user.address, { shouldValidate: true });
      setValue('postalCode', user.postalCode, { shouldValidate: true });
      setValue('city', user.city, { shouldValidate: true });
    }
  }, [isSameAddress, user, setValue]);

  const onSubmit = async (data: CompanyDataFormData) => {
    setLoading(true);
    setError('root', {
      type: 'server',
      message: '',
    });

    try {
      const company = await changeCompanyInfo(data);
      queryClient.setQueryData(['company'], company);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      {errors.root?.message && <FormError message={errors.root.message} />}
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
          label="Nazwa firmy *"
          placeholder="Nazwa firmy"
          {...register('name')}
          error={errors.name?.message}
        />

        <Input
          label="NIP *"
          placeholder="111-111-11-11"
          {...register('nip', {
            onChange: (e) => {
              e.target.value = formatNIP(e.target.value);
            },
          })}
          maxLength={13}
          error={errors.nip?.message}
        />

        <Input
          label="Telefon *"
          placeholder="+48 100-200-300"
          {...register('phone', {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[^\d+\s()-]/g, '');
            },
          })}
          error={errors.phone?.message}
        />

        <Input
          label="Email *"
          placeholder="Email"
          {...register('email')}
          error={errors.email?.message}
        />

        <div className="md:col-span-2">
          <Input
            label="Adres firmowy *"
            placeholder="Wpisz ulicę i numer domu"
            {...register('address')}
            error={errors.address?.message}
            disabled={isSameAddress}
            className={isSameAddress ? 'opacity-60 bg-background-secondary' : ''}
          />
        </div>

        <Input
          label="Kod pocztowy *"
          placeholder="00-000"
          {...register('postalCode', {
            onChange: (e) => {
              e.target.value = formatPostalCode(e.target.value);
            },
          })}
          error={errors.postalCode?.message}
          disabled={isSameAddress}
          className={isSameAddress ? 'opacity-60 bg-background-secondary' : ''}
          maxLength={6}
        />

        <Input
          label="Miasto *"
          placeholder="Wpisz miasto "
          {...register('city')}
          error={errors.city?.message}
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
        <BoardButton type="submit" size="medium" loading={loading}>
          Zapisz
        </BoardButton>
      </div>
    </form>
  );
};
