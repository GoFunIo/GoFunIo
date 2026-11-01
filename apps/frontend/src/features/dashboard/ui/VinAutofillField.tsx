import { useEffect } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import type {
  Control,
  UseFormClearErrors,
  UseFormGetValues,
  UseFormSetError,
  UseFormSetValue,
} from 'react-hook-form';

import { Input } from '@/components/ui/Input';
import type { AddVehicleFormData } from '../lib/formValidationRules';
import type { VehicleFuelType } from '../types';

type Props = {
  control: Control<AddVehicleFormData>;
  getValues: UseFormGetValues<AddVehicleFormData>;
  setValue: UseFormSetValue<AddVehicleFormData>;
  setError: UseFormSetError<AddVehicleFormData>;
  clearErrors: UseFormClearErrors<AddVehicleFormData>;
  error?: string;
  className?: string;
  disabled?: boolean;
  onLoadingChange?: (loading: boolean) => void;
};

type VinResponse = {
  vin: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  fuelType: string | null;
};

const VIN_LENGTH = 17;
const API_URL = 'https://db.vin/api/v1/vin';

const FUEL_TYPE_MAP: Record<string, VehicleFuelType> = {
  gasoline: 'PETROL',
  petrol: 'PETROL',
  diesel: 'DIESEL',
  lpg: 'LPG',
  hybrid: 'HYBRID',
  electric: 'ELECTRIC',
};

const INVALID_VIN_MESSAGE = 'Nieprawidłowy numer VIN. Sprawdź wprowadzony numer.';

export const VinAutofillField = ({
  control,
  getValues,
  setValue,
  setError,
  clearErrors,
  error,
  className,
  disabled,
  onLoadingChange,
}: Props) => {
  const vin = useWatch({
    control,
    name: 'vin',
  });

  useEffect(() => {
    const normalizedVin = (vin ?? '').replace(/\s/g, '').toUpperCase();

    clearErrors('root');

    if (normalizedVin.length !== VIN_LENGTH) {
      onLoadingChange?.(false);
      return;
    }

    const controller = new AbortController();

    const fetchVinData = async () => {
      onLoadingChange?.(true);

      try {
        const response = await fetch(`${API_URL}/${encodeURIComponent(normalizedVin)}`, {
          method: 'GET',
          signal: controller.signal,
        });

        if (
          controller.signal.aborted ||
          getValues('vin')?.replace(/\s/g, '').toUpperCase() !== normalizedVin
        ) {
          return;
        }

        if (response.status === 400 || response.status === 404) {
          setError('root', {
            type: 'manual',
            message: INVALID_VIN_MESSAGE,
          });
          return;
        }

        if (!response.ok) {
          throw new Error(`DB.VIN error: ${response.status}`);
        }

        const data: VinResponse = await response.json();

        if (
          controller.signal.aborted ||
          getValues('vin')?.replace(/\s/g, '').toUpperCase() !== normalizedVin
        ) {
          return;
        }

        if (!data.brand?.trim() || !data.model?.trim()) {
          setError('root', {
            type: 'manual',
            message: INVALID_VIN_MESSAGE,
          });
          return;
        }

        setValue('brand', data.brand.trim(), {
          shouldDirty: true,
          shouldValidate: true,
        });

        setValue('model', data.model.trim(), {
          shouldDirty: true,
          shouldValidate: true,
        });

        if (data.year) {
          setValue('productionYear', String(data.year), {
            shouldDirty: true,
            shouldValidate: true,
          });
        }

        const normalizedFuelType = data.fuelType?.trim().toLowerCase();

        const mappedFuelType = normalizedFuelType ? FUEL_TYPE_MAP[normalizedFuelType] : undefined;

        if (mappedFuelType) {
          setValue('fuelType', mappedFuelType, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('DB.VIN lookup failed:', error);

        if (getValues('vin')?.replace(/\s/g, '').toUpperCase() === normalizedVin) {
          setError('root', {
            type: 'manual',
            message: INVALID_VIN_MESSAGE,
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          onLoadingChange?.(false);
        }
      }
    };

    void fetchVinData();

    return () => {
      controller.abort();
      onLoadingChange?.(false);
    };
  }, [vin, getValues, setValue, setError, clearErrors, onLoadingChange]);

  return (
    <Controller
      name="vin"
      control={control}
      render={({ field }) => (
        <Input
          label="VIN"
          placeholder="17 znaków"
          error={error}
          className={className}
          name={field.name}
          ref={field.ref}
          value={field.value ?? ''}
          disabled={disabled}
          maxLength={VIN_LENGTH}
          onBlur={field.onBlur}
          onChange={(event) => {
            const value = event.target.value.replace(/\s/g, '').toUpperCase().slice(0, VIN_LENGTH);

            field.onChange(value);
          }}
        />
      )}
    />
  );
};
