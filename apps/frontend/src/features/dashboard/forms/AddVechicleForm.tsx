import { SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import classNames from 'classnames';
import { AddVehicleSchema } from '../lib/formValidationRules';
import { AddVehicleFormData } from '../types/FormTypes';
import { useLoading } from '@/hooks/useLoading';
import { Resolver } from 'react-hook-form';

type FormProps = {
  className?: string;
  onClose: () => void;
};

export const AddVehicleForm = ({ className, onClose }: FormProps) => {
  const { loading, setLoading } = useLoading();

  const {
    register,
    setError,
    clearErrors,
    formState: { errors },
    handleSubmit,
  } = useForm<AddVehicleFormData>({
    resolver: yupResolver(AddVehicleSchema) as Resolver<AddVehicleFormData>,
    reValidateMode: 'onChange',
    mode: 'onTouched',
    shouldFocusError: false,
  });

  const onSubmit: SubmitHandler<AddVehicleFormData> = async (data) => {
    setLoading(true);
    setError('root', { type: 'server', message: '' });

    try {
      console.log('Dane gotowe do wysyłki:', data);
      // Tutaj wleci axios/fetch
      onClose();
    } catch {
      setError('root', {
        type: 'server',
        message: 'Nie udało się dodać pojazdu. Spróbuj ponownie.',
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = '!text-[14px] !placeholder:text-[12px] font-medium';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={classNames('w-full', className)}>
      {errors.root?.message && (
        <p className="text-center text-[14px] font-medium text-alert mb-4">{errors.root.message}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <Input
          label="Marka *"
          placeholder="Podaj markę samochodu"
          error={errors.brand?.message}
          className={inputStyles}
          {...register('brand')}
          onFocus={() => clearErrors('brand')}
        />
        <Input
          label="Model *"
          placeholder="Podaj model samochodu"
          error={errors.model?.message}
          className={inputStyles}
          {...register('model')}
          onFocus={() => clearErrors('model')}
        />
        <Input
          label="Rok Produkcji"
          placeholder="Wybierz z listy rok produkcji"
          error={errors.productionYear?.message}
          className={inputStyles}
          {...register('productionYear')}
        />
        <Input
          label="Rodzaj paliwa"
          placeholder="Wybierz rodzaj paliwa"
          error={errors.fuelType?.message}
          className={inputStyles}
          {...register('fuelType')}
        />
        <Input
          label="VIN"
          placeholder="17 znaków"
          error={errors.vin?.message}
          className={inputStyles}
          {...register('vin')}
        />
        <Input
          label="Nr Rejestracyjny *"
          placeholder="Np. WA 12345"
          error={errors.registrationNumber?.message}
          className={inputStyles}
          {...register('registrationNumber')}
          onFocus={() => clearErrors('registrationNumber')}
        />
        <Input
          label="Aktualny przebieg (km)"
          placeholder="Podaj liczbę km"
          type="number"
          error={errors.currentMileage?.message}
          className={inputStyles}
          {...register('currentMileage')}
        />
        <Input
          label="Data zakupu"
          type="date"
          error={errors.purchaseDate?.message}
          className={inputStyles}
          {...register('purchaseDate')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Input
          label="Ważność OC"
          type="date"
          error={errors.ocExpiry?.message}
          className={inputStyles}
          {...register('ocExpiry')}
        />
        <Input
          label="Ważność AC"
          type="date"
          error={errors.acExpiry?.message}
          className={inputStyles}
          {...register('acExpiry')}
        />
        <Input
          label="Ważność przeglądu technicznego"
          type="date"
          error={errors.technicalInspectionExpiry?.message}
          className={inputStyles}
          {...register('technicalInspectionExpiry')}
        />
      </div>

      <div className="flex flex-col gap-1 mt-4">
        <label className="text-[14px] font-medium text-content-secondary mb-[8px]">Notatki</label>
        <textarea
          className={classNames(
            'w-full rounded-[7px] px-[16px] py-[12px] border text-[14px] font-medium focus:border-info custom-transition outline-none focus:ring-0 bg-white dark:bg-bg-card text-content-primary dark:text-white placeholder:text-icon min-h-[100px] resize-none',
            errors.notes?.message ? 'border-alert' : 'border-icon',
          )}
          placeholder="Dodatkowe informacje o pojeździe...."
          {...register('notes')}
        />
        {errors.notes?.message && (
          <p className="text-[10px] text-alert mt-1 text-right font-medium">
            {errors.notes.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 mt-6">
        <BoardButton
          type="button"
          variant="outline"
          size="medium"
          className="!w-[120px] sm:!w-[140px]"
          onClick={onClose}
          disabled={loading}
        >
          Anuluj
        </BoardButton>
        <BoardButton
          type="submit"
          variant="default"
          size="medium"
          className="!w-[120px] sm:!w-[140px]"
          disabled={loading}
        >
          Dodaj
        </BoardButton>
      </div>
    </form>
  );
};
