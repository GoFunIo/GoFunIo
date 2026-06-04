import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '../ui/BoardButton';
import classNames from 'classnames';
import { useLoading } from '@/hooks/useLoading';
import { Resolver } from 'react-hook-form';

import { AddServiceFormData, AddServiceSchema } from '../lib/formValidationRules';
import { carsArr } from '@/store/cars';
import { Select } from '../ui/Select';
import { useEffect, useRef } from 'react';
import { DatePicker } from '../ui/DatePicker';
import { Paperclip, Upload, X } from 'lucide-react';

type FormProps = {
  className?: string;
  onClose: () => void;
  initialData?: Partial<AddServiceFormData> & { id?: string | number };
};

const serviceTypeOptions = [
  { id: 1, value: 'Pełny serwis', label: 'Pełny serwis' },
  { id: 2, value: 'Wymiana oleju', label: 'Wymiana oleju' },
  { id: 3, value: 'Przegląd techniczny', label: 'Przegląd techniczny' },
  { id: 4, value: 'Naprawa zawieszenia', label: 'Naprawa zawieszenia' },
  { id: 5, value: 'Układ hamulcowy', label: 'Układ hamulcowy' },
  { id: 6, value: 'Inne', label: 'Inne' },
];

export const AddVehicleServiceForm = ({ className, onClose, initialData }: FormProps) => {
  const { loading, setLoading } = useLoading();
  const isEditMode = !!initialData?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    reset,
    setError,
    clearErrors,
    watch,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm<AddServiceFormData>({
    resolver: yupResolver(AddServiceSchema) as Resolver<AddServiceFormData>,
    reValidateMode: 'onChange',
    mode: 'onTouched',
    shouldFocusError: false,
    defaultValues: initialData || {},
  });

  const currentAttachment = watch('attachment');

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        serviceType: '',
        cost: undefined,
        attachment: undefined,
      });
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<AddServiceFormData> = async (data) => {
    setLoading(true);
    setError('root', { type: 'server', message: '' });

    try {
      if (isEditMode) {
        console.log(`Aktualizacja wpisu serwisowego o ID ${initialData?.id}:`, data);
        // Miejsce na API: await axios.put(`/api/services/${initialData.id}`, data)
      } else {
        console.log('Dodawanie nowego wpisu serwisowego:', data);
        // Miejsce na API: await axios.post('/api/services', data)
      }
      onClose();
    } catch {
      setError('root', {
        type: 'server',
        message: 'Wystąpił błąd podczas zapisywania wpisu. Spróbuj ponownie.',
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    '!text-[14px] !placeholder:text-[12px] !placeholder:text-icon w-full !font-normal';

  const carOptions = carsArr.map((car) => ({
    id: car.id,
    value: String(car.id),
    label: `${car.brand} ${car.model} (${car.registrationNumber})`,
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setValue('attachment', file, { shouldValidate: true });
    }
  };

  const handleRemoveFile = () => {
    setValue('attachment', undefined, { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
                value={field.value ?? null}
                onChange={(val) => {
                  field.onChange(val);
                  clearErrors('vehicleId');
                }}
                placeholder="Wybierz z listy"
                className="w-full !h-[45px] "
                error={errors.vehicleId?.message}
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
                  value={field.value ?? null}
                  onChange={(val) => {
                    field.onChange(val);
                    clearErrors('serviceType');
                  }}
                  placeholder="Podaj rodzaj serwisu"
                  className="w-full !h-[45px]"
                  error={errors.serviceType?.message}
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
            type="number"
            step="0.01"
            error={errors.cost?.message}
            className={inputStyles}
            {...register('cost')}
          />
          <Input
            label="Warsztat *"
            placeholder="Nazwa warsztatu"
            error={errors.servicePlace?.message}
            className={inputStyles}
            {...register('servicePlace')}
          />
        </div>

        {/* NOTATKI */}
        <div className="flex flex-col gap-1">
          <label className="text-[14px] font-medium text-content-secondary mb-[4px]">Notatki</label>
          <textarea
            className={classNames(
              'w-full rounded-[7px] px-[16px] py-[12px] border text-[14px] font-medium focus:border-info custom-transition outline-none focus:ring-0 bg-bg-card text-content-primary placeholder:text-icon min-h-[100px] resize-none',
              errors.notes?.message ? 'border-alert' : 'border-icon',
            )}
            placeholder="Dodatkowe informacje o pojeździe ...."
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
          <label className="text-[14px] text-content-secondary font-medium mb-[4px]">
            Załącznik (faktura / zdjęcie)
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
          />

          {!currentAttachment ? (
            /* Widok, gdy nie ma jeszcze wgranego pliku */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-[45px] border border-dashed border-icon rounded-[7px] flex items-center justify-center gap-2 text-content-secondary hover:border-secondary hover:text-secondary custom-transition text-[14px]"
            >
              <Upload size={16} />
              Załącz dokumenty z dysku
            </button>
          ) : (
            /* Widok paska z wgranym już plikiem i opcją usunięcia */
            <div className="w-full h-[45px] border border-icon rounded-[7px] bg-bg-section flex items-center justify-between px-4 text-[14px]">
              <div className="flex items-center gap-2 text-content-primary truncate">
                <Paperclip size={16} className="text-info shrink-0" />
                <span className="truncate">
                  {currentAttachment instanceof File ? currentAttachment.name : 'Załączony plik'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-content-secondary hover:text-alert custom-transition p-1"
              >
                <X size={16} />
              </button>
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
