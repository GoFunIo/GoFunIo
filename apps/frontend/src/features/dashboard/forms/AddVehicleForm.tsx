import { SubmitHandler, useForm, Resolver, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import classNames from 'classnames';

import { AddVehicleFormData, AddVehicleSchema } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import { useCreateVehicle, useUpdateVehicle } from '../hooks/vehicles.hooks';
import { VehicleData } from '@/features/dashboard/types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  withTransform,
  toUpperCase,
  toUpperCaseNoSpaces,
  capitalizeWords,
} from '@/utils/formFieldTransforms';
import { FormDatePicker } from '../ui/FormDatePicker';
import { FUEL_OPTIONS } from '../constants/fuelOptions';
import { FormSelect } from '../ui/FormSelect';

type FormProps = {
  className?: string;
  initialData?: VehicleData;
  isRenewalMode?: boolean;
  onClose: () => void;
};

const mapInitialDataToForm = (data?: Partial<VehicleData>): AddVehicleFormData => {
  return {
    brand: data?.brand ?? '',
    model: data?.model ?? '',
    registrationNumber: data?.registrationNumber ?? '',
    productionYear: data?.productionYear != null ? String(data.productionYear) : undefined,
    fuelType: data?.fuelType ?? undefined,
    vin: data?.vin ?? undefined,
    currentMileage: data?.currentMileage ?? undefined,
    purchaseDate: data?.purchaseDate ?? undefined,
    ocExpiry: data?.ocExpiry ?? undefined,
    acExpiry: data?.acExpiry ?? undefined,
    technicalInspectionExpiry: data?.technicalInspectionExpiry ?? undefined,
    notes: data?.notes ?? undefined,
  };
};

export const AddVehicleForm = ({
  className,
  onClose,
  initialData,
  isRenewalMode = false,
}: FormProps) => {
  const isEditMode = !!initialData?.id;

  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();

  const loading = isEditMode ? updateVehicleMutation.isPending : createVehicleMutation.isPending;

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
    values: mapInitialDataToForm(initialData),
  });

  const onSubmit: SubmitHandler<AddVehicleFormData> = async (data) => {
    clearErrors('root');

    try {
      if (isEditMode && initialData?.id) {
        await updateVehicleMutation.mutateAsync({
          id: String(initialData.id),
          form: data,
        });
      } else {
        await createVehicleMutation.mutateAsync(data);
      }

      if (!isEditMode) {
        reset();
      }
      onClose();
    } catch (err) {
      setError('root', {
        type: 'server',
        message: getErrorMessage(err, {
          409: 'Pojazd o takim numerze rejestracyjnym już istnieje.',
        }),
      });
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
          {...withTransform(register('brand'), capitalizeWords)}
          onFocus={() => clearErrors('brand')}
          disabled={isRenewalMode || loading}
        />
        <Input
          label="Model *"
          placeholder="Podaj model samochodu"
          error={errors.model?.message}
          className={inputStyles}
          {...withTransform(register('model'), capitalizeWords)}
          onFocus={() => clearErrors('model')}
          disabled={isRenewalMode || loading}
        />

        <Input
          label="Rok Produkcji"
          placeholder="Np. 2024"
          type="number"
          error={errors.productionYear?.message}
          className={inputStyles}
          {...register('productionYear')}
          disabled={isRenewalMode || loading}
        />

        <FormSelect
          control={control}
          name="fuelType"
          label="Rodzaj paliwa"
          options={FUEL_OPTIONS}
          placeholder="Wybierz rodzaj paliwa"
          error={errors.fuelType?.message}
          disabled={isRenewalMode || loading}
        />

        <Input
          label="VIN"
          placeholder="17 znaków"
          error={errors.vin?.message}
          className={inputStyles}
          {...withTransform(register('vin'), toUpperCase)}
          disabled={isRenewalMode || loading}
        />
        <Input
          label="Nr Rejestracyjny *"
          placeholder="Np. WA12345"
          error={errors.registrationNumber?.message}
          className={inputStyles}
          {...withTransform(register('registrationNumber'), toUpperCaseNoSpaces)}
          onFocus={() => clearErrors('registrationNumber')}
          disabled={isRenewalMode || loading}
        />
        <Controller
          name="currentMileage"
          control={control}
          render={({ field }) => (
            <Input
              label="Aktualny przebieg (km)"
              placeholder="Podaj liczbę km"
              inputMode="decimal"
              type="text"
              error={errors.currentMileage?.message}
              className={inputStyles}
              value={field.value ?? ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');

                field.onChange(value === '' ? undefined : Number(value));
              }}
              disabled={isRenewalMode || loading}
            />
          )}
        />
        <FormDatePicker
          control={control}
          name="purchaseDate"
          label="Data zakupu"
          error={errors.purchaseDate?.message}
          disabled={isRenewalMode || loading}
          maxDate
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 ">
        <FormDatePicker
          control={control}
          name="technicalInspectionExpiry"
          label="Ważność przeglądu"
          error={errors.technicalInspectionExpiry?.message}
        />

        <FormDatePicker
          control={control}
          name="ocExpiry"
          label="Ważność OC"
          error={errors.ocExpiry?.message}
        />

        <FormDatePicker
          control={control}
          name="acExpiry"
          label="Ważność AC"
          error={errors.acExpiry?.message}
        />
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
