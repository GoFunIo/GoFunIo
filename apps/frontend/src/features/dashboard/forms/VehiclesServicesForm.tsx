import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo } from 'react';
import classNames from 'classnames';

import { AddServiceFormData, AddServiceSchema } from '../lib/formValidationRules';
import { useCreateService, useUpdateService } from '../hooks/services.hooks';
import { useVehicles } from '../hooks/vehicles.hooks';
import { SingleServiceData, VehicleData } from '../types';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { handlePriceInput } from '@/utils/handlePhoneInput';
import { serviceTypeOptions } from '../constants/serviceOptions';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';

import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import { FormDatePicker } from '../ui/FormDatePicker';
import { AttachmentsForm } from './AttachmentsForm';
import { FormSelect } from '../ui/FormSelect';

type BaseFormProps = {
  className?: string;
  onClose: () => void;
  currentVehicle?: VehicleData | null;
};

type FormProps = BaseFormProps &
  (
    | {
        mode: 'create';
        service?: never;
      }
    | {
        mode: 'edit';
        service: SingleServiceData;
      }
  );

export const VehiclesServiceForm = ({
  className,
  onClose,
  service,
  mode,
  currentVehicle,
}: FormProps) => {
  const { mutateAsync: createService, isPending: isCreating } = useCreateService();
  const { mutateAsync: updateService, isPending: isUpdating } = useUpdateService();
  const { data: vehiclesData, isLoading: isVehiclesLoading } = useVehicles();

  const isPending = isCreating || isUpdating;

  const carOptions = useMemo(() => {
    if (!vehiclesData) return [];

    const vehiclesList = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.items ?? []);

    return vehiclesList.map((car) => ({
      id: car.id,
      value: String(car.id),
      label: `${car.brand} ${car.model} (${car.registrationNumber})`,
    }));
  }, [vehiclesData]);

  const {
    register,
    control,
    setError,
    clearErrors,
    watch,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm<AddServiceFormData>({
    resolver: yupResolver(AddServiceSchema),
    reValidateMode: 'onChange',
    mode: 'onTouched',
    shouldFocusError: false,
    defaultValues: {
      vehicleId: currentVehicle?.id ?? service?.vehicleId ?? '',
      serviceDate: service?.serviceDate ?? '',
      serviceType: service?.type ?? '',
      servicePlace: service?.providerName ?? '',
      cost: service?.cost ? Number(service.cost) : undefined,
      notes: service?.notes ?? '',
      attachments: service?.attachments ?? [],
    },
  });

  const currentAttachments = watch('attachments');

  const onSubmit: SubmitHandler<AddServiceFormData> = async (formData) => {
    try {
      if (mode === 'create') {
        await createService(formData);
      } else {
        await updateService({
          service,
          formData,
        });
      }

      onClose();
    } catch (err) {
      setError('root', {
        type: 'server',
        message: getErrorMessage(err, {
          403: 'Brak uprawnień do tego zasobu lub operacji.',
          404: 'Pojazd lub serwis nie został znaleziony.',
          503: 'Magazyn załączników jest niedostępny',
        }),
      });
    }
  };

  const inputStyles =
    '!text-[14px] !placeholder:text-[12px] !placeholder:text-icon w-full !font-normal';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={classNames('w-full text-left', className)}>
      {errors.root?.message && (
        <p className="text-center text-[14px] font-medium text-alert mb-4">{errors.root.message}</p>
      )}

      <div className="flex flex-col gap-y-4">
        <FormSelect
          control={control}
          name="vehicleId"
          label="Pojazd *"
          options={carOptions}
          placeholder={isVehiclesLoading ? 'Wczytywanie pojazdów...' : 'Wybierz z listy'}
          error={errors.vehicleId?.message}
          disabled={isPending || !!currentVehicle || mode === 'edit'}
          onValueChange={() => clearErrors('vehicleId')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormDatePicker
            control={control}
            name="serviceDate"
            label="Data serwisu *"
            error={errors.serviceDate?.message}
            disabled={isPending}
            maxDate
            clearable
          />

          <FormSelect
            control={control}
            name="serviceType"
            label="Typ *"
            options={serviceTypeOptions}
            placeholder="Podaj rodzaj serwisu"
            error={errors.serviceType?.message}
            disabled={isPending}
            onValueChange={() => clearErrors('serviceType')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Controller
            name="cost"
            control={control}
            render={({ field }) => (
              <Input
                label="Koszt *"
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                error={errors.cost?.message}
                className={inputStyles}
                value={field.value ?? ''}
                onChange={(e) => {
                  const value = handlePriceInput(e.target.value);

                  field.onChange(value);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                disabled={isPending}
              />
            )}
          />

          <Input
            label="Warsztat *"
            placeholder="Nazwa warsztatu"
            error={errors.servicePlace?.message}
            className={inputStyles}
            {...register('servicePlace')}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[14px] font-medium text-content-secondary mb-[4px]">Opis</label>
          <textarea
            className={classNames(
              'w-full rounded-[7px] px-[16px] py-[12px] border text-[14px] font-medium focus:border-info custom-transition outline-none focus:ring-0 bg-bg-card text-content-primary placeholder:text-icon min-h-[50px] resize-none',
              errors.notes?.message ? 'border-alert' : 'border-icon',
            )}
            placeholder="Inne: określ czynność np. wymiana klocków hamulcowych, przegląd klimatyzacji itp "
            {...register('notes')}
          />
          {errors.notes?.message && (
            <p className="text-[10px] text-alert mt-1 text-right font-medium">
              {errors.notes.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between w-full">
            <label className="text-[14px] text-content-secondary font-medium mb-[4px]">
              Załączniki (.PDF, .JPEG lub .PNG, do 10 MB każdy)
            </label>
            <label className="text-[14px] text-content-secondary font-medium mb-[4px]">
              Załączono {currentAttachments.length}/{MAX_FILES_PER_UPLOAD}
            </label>
          </div>

          <AttachmentsForm
            mode="local"
            serviceId={service?.id}
            attachments={currentAttachments}
            onChange={(attachments) =>
              setValue('attachments', attachments, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 mt-6">
        <BoardButton
          type="button"
          variant="outline"
          size="medium"
          className="!w-[120px] sm:!w-[140px]"
          onClick={onClose}
          disabled={isPending}
        >
          Anuluj
        </BoardButton>
        <BoardButton
          type="submit"
          variant="default"
          size="medium"
          className="!w-[120px] sm:!w-[140px]"
          loading={isPending}
          disabled={isPending}
        >
          Zapisz
        </BoardButton>
      </div>
    </form>
  );
};
