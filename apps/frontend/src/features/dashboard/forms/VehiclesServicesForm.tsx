import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo, useRef } from 'react';
import classNames from 'classnames';
import { Download, Paperclip, Pencil, Trash2, Upload } from 'lucide-react';

import { AddServiceFormData, AddServiceSchema } from '../lib/formValidationRules';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';

import { serviceTypeOptions } from '../constants/serviceOptions';
import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { useCreateService, useUpdateService } from '../hooks/services.hooks';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { formatFileSize, formatFileType } from '@/utils/formatFile';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';
import { FormAttachment } from '../types/AttachmentTypes';
import { SingleServiceData } from '../types';
import { handlePriceInput } from '@/utils/handlePhoneInput';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      attachments:
        service?.attachments?.map((attachment) => ({
          ...attachment,
          type: 'existing' as const,
        })) ?? [],
    },
  });

  const currentAttachments = watch('attachments');
  const onSubmit: SubmitHandler<AddServiceFormData> = async (formData) => {
    try {
      if (mode === 'create') {
        await createService(formData);
      } else {
        await updateService({
          id: service.id,
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

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (currentAttachments.length >= MAX_FILES_PER_UPLOAD) {
      return;
    }

    const attachment: FormAttachment = {
      type: 'new',
      file,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setValue('attachments', [...currentAttachments, attachment], {
      shouldValidate: true,
      shouldDirty: true,
    });

    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setValue(
      'attachments',
      currentAttachments.filter((_, i) => i !== index),
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );
  };

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
                    field.onChange(date ? date.toISOString().split('T')[0] : '');
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

          {currentAttachments.length < MAX_FILES_PER_UPLOAD && (
            <div className="">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAddFile}
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer w-full h-[45px] border border-dashed border-icon rounded-[7px] flex items-center justify-center gap-2 text-content-secondary hover:border-secondary hover:text-secondary custom-transition text-[14px]"
              >
                <Upload size={16} />
                Załącz dokumenty z dysku
              </button>
            </div>
          )}

          {currentAttachments?.length > 0 && (
            <div className="flex flex-col gap-3 mt-3">
              {currentAttachments?.map((item, index) => {
                return (
                  <div
                    key={`${item?.name}-${item?.size}-${index}`}
                    className="flex items-center gap-3"
                  >
                    <Paperclip size={21} className="text-content-secondary shrink-0" />

                    <div className="">
                      <p className="text-[14px] text-content-secondary">{item?.name}</p>
                      <p className="text-[14px] text-content-secondary">
                        {formatFileSize(item?.size)} · {formatFileType(item?.mimeType)} ·{' '}
                        {item?.createdAt}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-auto">
                      {mode === 'edit' && (
                        <>
                          <button className="cursor-pointer">
                            <Download size={21} className="text-content-secondary" />
                          </button>
                          <button className="cursor-pointer">
                            <Pencil size={21} className="text-content-secondary" />
                          </button>
                        </>
                      )}
                      <button className="cursor-pointer" onClick={() => handleRemoveFile(index)}>
                        <Trash2 size={21} className="text-content-secondary" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
