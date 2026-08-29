import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo } from 'react';
import classNames from 'classnames';

import { AddServiceFormData, AddServiceSchema } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';

import { serviceTypeOptions } from '../constants/serviceOptions';
import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { useCreateService, useUpdateService } from '../hooks/services.hooks';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';
import { SingleServiceData } from '../types';
import { handlePriceInput } from '@/utils/handlePhoneInput';
import { AttachmentsForm } from './AttachmentsForm';
import { formatDate } from '@/utils/formatFile';

type BaseFormProps = {
  className?: string;
  onClose: () => void;
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

export const VehiclesServiceForm = ({ className, onClose, service, mode }: FormProps) => {
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
      vehicleId: service?.vehicleId ?? '',
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
          409: 'Wystąpił konflikt danych — sprawdź wprowadzone informacje.',
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
        {/* POJAZD */}
        <div className="flex flex-col gap-1 relative pb-2">
          <div className="flex justify-between items-center">
            <label className="text-[14px]  text-content-secondary font-medium mb-[4px]">
              Pojazd *
            </label>
            {errors.vehicleId?.message && (
              <p className="text-[12px] text-alert font-medium absolute right-0 top-0">
                {errors.vehicleId.message}
              </p>
            )}
          </div>
          <Controller
            control={control}
            name="vehicleId"
            render={({ field }) => (
              <Select
                options={carOptions}
                value={field.value ?? ''}
                clearOption={false}
                onChange={(val) => {
                  field.onChange(val);
                  clearErrors('vehicleId');
                }}
                placeholder={isVehiclesLoading ? 'Wczytywanie pojazdów...' : 'Wybierz z listy'}
                className="w-full !h-[45px] "
                error={errors.vehicleId?.message}
                disabled={isPending}
              />
            )}
          />
        </div>

        {/* DATA SERWISU I TYP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1 relative pb-2">
            <div className="flex justify-between items-center">
              <label className="text-[14px] text-content-secondary font-medium mb-[4px]">
                Data serwisu *
              </label>
              {errors.serviceDate?.message && (
                <p className="text-[12px] text-alert font-medium absolute right-0 top-0">
                  {errors.serviceDate.message}
                </p>
              )}
            </div>
            <Controller
              control={control}
              name="serviceDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => {
                    field.onChange(formatDate(date));
                    clearErrors('serviceDate');
                  }}
                  placeholder="Wybierz datę serwisu"
                  className="!w-full h-[45px]"
                />
              )}
            />
          </div>

          {/* TYP SERWISU */}
          <div className="flex flex-col gap-1 relative pb-2">
            <div className="flex justify-between items-center">
              <label className="text-[14px] font-medium text-content-secondary font-medium mb-[4px]">
                Typ *
              </label>
              {errors.serviceType?.message && (
                <p className="text-[12px] text-alert font-medium absolute right-0 top-0">
                  {errors.serviceType.message}
                </p>
              )}
            </div>
            <Controller
              control={control}
              name="serviceType"
              render={({ field }) => (
                <Select
                  options={serviceTypeOptions}
                  value={field.value ?? ''}
                  clearOption={false}
                  onChange={(val) => {
                    field.onChange(val ?? undefined);
                    clearErrors('serviceType');
                  }}
                  placeholder="Podaj rodzaj serwisu"
                  className="w-full !h-[45px]"
                  error={errors.serviceType?.message}
                  disabled={isPending}
                />
              )}
            />
          </div>
        </div>

        {/* KOSZT I WARSZTAT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Input
            label="Koszt *"
            placeholder="0.00"
            type="text"
            inputMode="decimal"
            min="0"
            error={errors.cost?.message}
            className={inputStyles}
            {...register('cost', {
              setValueAs: (value) => {
                if (value === '') return undefined;

                return Number(String(value).replace(',', '.'));
              },
              onChange: (e) => {
                e.target.value = handlePriceInput(e.target.value);
              },
            })}
            disabled={isPending}
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

        {/* NOTATKI */}
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

        {/* ZAŁĄCZNIK */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between w-full">
            <label className="text-[14px] text-content-secondary font-medium mb-[4px]">
              Załaczniki (.PDF, .JPEG lub .PNG, do 10 MB każdy)
            </label>
            <label className="text-[14px] text-content-secondary font-medium mb-[4px]">
              Dostępna ilość {currentAttachments.length}/{MAX_FILES_PER_UPLOAD}
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
