import { useEffect, useRef } from 'react';
import {
  Control,
  UseFormClearErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetError,
  UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import { AddVehicleFormData } from '../lib/formValidationRules';
import { VehicleByVin } from '../api/vin.api';
import { Input } from '@/components/ui/Input';
import { withTransform, toUpperCase } from '@/utils/formFieldTransforms';

type Props = {
  control: Control<AddVehicleFormData>;
  register: UseFormRegister<AddVehicleFormData>;
  getValues: UseFormGetValues<AddVehicleFormData>;
  setValue: UseFormSetValue<AddVehicleFormData>;
  setError: UseFormSetError<AddVehicleFormData>;
  clearErrors: UseFormClearErrors<AddVehicleFormData>;
  onLoadingChange: (loading: boolean) => void;
  error?: string;
  disabled?: boolean;
};

export const InputVIN = ({
  control,
  register,
  getValues,
  setValue,
  setError,
  clearErrors,
  onLoadingChange,
  error,
  disabled,
}: Props) => {
  const vin = useWatch({
    control,
    name: 'vin',
  });

  const lastVinRef = useRef(vin?.trim().toUpperCase());

  useEffect(() => {
    const normalizedVin = vin?.trim().toUpperCase();

    if (normalizedVin === lastVinRef.current) return;

    lastVinRef.current = normalizedVin;

    if (!normalizedVin || normalizedVin.length !== 17) return;

    const controller = new AbortController();

    const lookupVin = async () => {
      onLoadingChange(true);

      try {
        clearErrors('root');

        const result = await VehicleByVin(normalizedVin, controller.signal);

        if (controller.signal.aborted) return;

        const fields = [
          { name: 'brand', value: result.brand },
          { name: 'model', value: result.model },
          {
            name: 'productionYear',
            value: result.year != null ? String(result.year) : undefined,
          },
          { name: 'fuelType', value: result.fuelType },
        ] as const;

        fields.forEach(({ name, value }) => {
          if (value == null || String(value).trim() === '') return;

          const currentValue = getValues(name);

          if (currentValue != null && String(currentValue).trim() !== '') {
            return;
          }

          setValue(name, value as never, {
            shouldDirty: true,
            shouldValidate: true,
          });
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        const statusCode = (error as { statusCode?: number }).statusCode;

        const messages: Record<number, string> = {
          400: 'Nieprawidłowy numer VIN. Sprawdź wprowadzony numer.',
          404: 'Nie znaleziono pojazdu o podanym numerze VIN.',
          429: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.',
          503: 'Usługa VIN jest chwilowo niedostępna.',
        };

        setError('root', {
          type: 'manual',
          message: messages[statusCode ?? 0] ?? 'Nie udało się pobrać danych pojazdu.',
        });
      } finally {
        if (!controller.signal.aborted) {
          onLoadingChange(false);
        }
      }
    };

    lookupVin();

    return () => {
      controller.abort();
      onLoadingChange(false);
    };
  }, [vin, setValue, getValues, setError, clearErrors, onLoadingChange]);

  return (
    <div className="mb-3">
      <Input
        label="VIN"
        placeholder="17 znaków"
        error={error}
        className="!text-[14px] !placeholder:text-[12px]"
        {...withTransform(register('vin'), toUpperCase)}
        disabled={disabled}
      />
    </div>
  );
};
