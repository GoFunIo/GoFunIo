import { SubmitHandler, useForm, Controller, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import classNames from 'classnames';
import { AddVehicleFormData, AddVehicleSchema } from '../lib/formValidationRules';
import { useLoading } from '@/hooks/useLoading';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import { DatePicker } from '../ui/DatePicker';
import { Select } from '../ui/Select';
import { useEffect } from 'react';

type FormProps = {
  className?: string;
  onClose: () => void;
  initialData?: Partial<AddVehicleFormData> & { id?: string | number };
  isRenewalMode?: boolean;
};

const FUEL_OPTIONS = [
  { id: 1, value: 'Diesel', label: 'Diesel' },
  { id: 2, value: 'Benzyna', label: 'Benzyna' },
  { id: 3, value: 'LPG', label: 'LPG' },
  { id: 4, value: 'Hybryda', label: 'Hybryda' },
  { id: 5, value: 'Elektryk', label: 'Elektryk' },
];

export const AddVehicleForm = ({
  className,
  onClose,
  initialData,
  isRenewalMode = false,
}: FormProps) => {
  const { loading, setLoading } = useLoading();
  const isEditMode = !!initialData?.id;

  const {
    register,
    setError,
    clearErrors,
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<AddVehicleFormData>({
    resolver: yupResolver(AddVehicleSchema) as Resolver<AddVehicleFormData>,
    reValidateMode: 'onChange',
    mode: 'onTouched',
    shouldFocusError: false,
    defaultValues: initialData || {},
  });

  useEffect(() => {
    reset(initialData || {});
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<AddVehicleFormData> = async (data) => {
    setLoading(true);
    setError('root', { type: 'server', message: '' });

    try {
      if (isEditMode) {
        console.log(`Aktualizacja pojazdu o ID ${initialData?.id}:`, data);
        // Tutaj wleci axios.put(`/api/vehicles/${initialData.id}`, data)
      } else {
        console.log('Dodawanie nowego pojazdu:', data);
        // Tutaj wleci axios.post('/api/vehicles', data)
      }
      console.log('Dane gotowe do wysyłki:', data);
      // Tutaj wleci axios/fetch
      onClose();
    } catch {
      const errorMessage = isEditMode
        ? 'Nie udało się zaktualizować pojazdu. Spróbuj ponownie.'
        : 'Nie udało się dodać pojazdu. Spróbuj ponownie.';

      setError('root', { type: 'server', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = '!text-[14px] !placeholder:text-[12px]';

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
          disabled={isRenewalMode}
        />
        <Input
          label="Model *"
          placeholder="Podaj model samochodu"
          error={errors.model?.message}
          className={inputStyles}
          {...register('model')}
          onFocus={() => clearErrors('model')}
          disabled={isRenewalMode}
        />

        {/* Rok Produkcji */}
        <div
          className={classNames('flex flex-col gap-1 transition-opacity', {
            'opacity-60 select-none pointer-events-none': isRenewalMode,
          })}
        >
          <div className="flex justify-between items-center">
            <label className="text-[14px] font-medium text-content-secondary">Rok Produkcji</label>
            {errors.productionYear?.message && (
              <span className="text-[12px] font-medium text-alert">
                {errors.productionYear.message}
              </span>
            )}
          </div>
          <Controller
            control={control}
            name="productionYear"
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) => field.onChange(date)}
                placeholder="Wybierz rok produkcji"
                className="!w-full h-[40px] "
              />
            )}
          />
        </div>

        {/* Rodzaj paliwa */}
        <div
          className={classNames('flex flex-col gap-1 transition-opacity', {
            'opacity-60 select-none pointer-events-none': isRenewalMode,
          })}
        >
          <div className="flex justify-between items-center">
            <label className="text-[14px] font-medium text-content-secondary">Rodzaj paliwa</label>
            {errors.fuelType?.message && (
              <span className="text-[12px] font-medium text-alert">{errors.fuelType.message}</span>
            )}
          </div>
          <Controller
            control={control}
            name="fuelType"
            render={({ field }) => (
              <Select
                options={FUEL_OPTIONS}
                value={field.value || null}
                onChange={(val) => field.onChange(val)}
                placeholder="Wybierz rodzaj paliwa"
                clearOption={false}
                className="!w-full h-[40px]"
                error={errors.fuelType?.message}
              />
            )}
          />
        </div>

        <Input
          label="VIN"
          placeholder="17 znaków"
          error={errors.vin?.message}
          className={inputStyles}
          {...register('vin')}
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
          }}
          disabled={isRenewalMode}
        />
        <Input
          label="Nr Rejestracyjny *"
          placeholder="Np. WA 12345"
          error={errors.registrationNumber?.message}
          className={inputStyles}
          {...register('registrationNumber')}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\s/g, '').toUpperCase();
          }}
          onFocus={() => clearErrors('registrationNumber')}
          disabled={isRenewalMode}
        />
        <Input
          label="Aktualny przebieg (km)"
          placeholder="Podaj liczbę km"
          type="number"
          error={errors.currentMileage?.message}
          className={inputStyles}
          {...register('currentMileage')}
          disabled={isRenewalMode}
        />

        {/* Data zakupu */}
        <div
          className={classNames('flex flex-col gap-1 transition-opacity', {
            'opacity-60 select-none pointer-events-none': isRenewalMode,
          })}
        >
          <div className="flex justify-between items-center">
            <label className="text-[14px] font-medium text-content-secondary">Data zakupu</label>
            {errors.purchaseDate?.message && (
              <span className="text-[12px] font-medium text-alert">
                {errors.purchaseDate.message}
              </span>
            )}
          </div>
          <Controller
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                className="!w-full h-[40px]"
              />
            )}
            disabled={isRenewalMode}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 ">
        {/* Ważność OC */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[14px] font-medium text-content-secondary">Ważność OC</label>
            {errors.ocExpiry?.message && (
              <span className="text-[12px] font-medium text-alert">{errors.ocExpiry.message}</span>
            )}
          </div>
          <Controller
            control={control}
            name="ocExpiry"
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                className="!w-full h-[40px]"
              />
            )}
          />
        </div>

        {/* Ważność AC */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[14px] font-medium text-content-secondary">Ważność AC</label>
            {errors.acExpiry?.message && (
              <span className="text-[12px] font-medium text-alert">{errors.acExpiry.message}</span>
            )}
          </div>
          <Controller
            control={control}
            name="acExpiry"
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                className="!w-full h-[40px]"
              />
            )}
          />
        </div>

        {/* Ważność przeglądu technicznego */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-[14px] font-medium text-content-secondary">
              Ważność przeglądu
            </label>
            {errors.technicalInspectionExpiry?.message && (
              <span className="text-[12px] font-medium text-alert">
                {errors.technicalInspectionExpiry.message}
              </span>
            )}
          </div>
          <Controller
            control={control}
            name="technicalInspectionExpiry"
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')}
                className="!w-full h-[40px]"
              />
            )}
          />
        </div>
      </div>

      <div
        className={classNames('flex flex-col gap-1 transition-opacity mt-4', {
          'opacity-60 select-none pointer-events-none': isRenewalMode,
        })}
      >
        <label className="text-[14px] font-medium text-content-secondary mb-[8px]">Notatki</label>
        <textarea
          className={classNames(
            'w-full rounded-[7px] px-[16px] py-[12px] border text-[14px] focus:border-info custom-transition outline-none focus:ring-0 bg-white dark:bg-bg-card text-content-primary dark:text-white placeholder:text-icon min-h-[50px] resize-none',
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
          {isEditMode ? 'Zapisz' : 'Dodaj'}
        </BoardButton>
      </div>
    </form>
  );
};
