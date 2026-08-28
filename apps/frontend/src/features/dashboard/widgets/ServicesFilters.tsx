import { useMemo } from 'react';
import { useVehicles } from '../hooks/vehicles.hooks';
import { Select } from '../ui/Select';
import { Filters } from './Filters';
import { ServicesFiltersType, ServiceType } from '../types';
import { serviceTypeOptions } from '../constants/serviceOptions';
import { DatePicker } from '../ui/DatePicker';

type Props = {
  filters: ServicesFiltersType;
  onChange: (filters: ServicesFiltersType) => void;
};

export const ServicesFilters = ({ filters, onChange }: Props) => {
  const { data: vehiclesData } = useVehicles();

  const carOptions = useMemo(() => {
    if (!vehiclesData) return [];

    const vehiclesList = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.items ?? []);

    return vehiclesList.map((car) => ({
      id: car.id,
      value: String(car.id),
      label: `${car.brand} ${car.model} (${car.registrationNumber})`,
    }));
  }, [vehiclesData]);

  return (
    <Filters>
      <Select
        value={filters.vehicleId}
        onChange={(value) =>
          onChange({
            ...filters,
            vehicleId: value as string | null,
          })
        }
        placeholder="Wszystkie pojazdy"
        options={carOptions}
        className="w-full"
      />

      <Select
        value={filters.type}
        onChange={(value) =>
          onChange({
            ...filters,
            type: value as ServiceType | null,
          })
        }
        placeholder="Wszystkie typy"
        options={serviceTypeOptions}
        className="w-full"
      />

      <DatePicker
        value={filters.from}
        onChange={(value) =>
          onChange({
            ...filters,
            from: value,
          })
        }
        className="w-full"
        clearable
      />

      <DatePicker
        value={filters.to}
        onChange={(value) =>
          onChange({
            ...filters,
            to: value,
          })
        }
        className="w-full"
        clearable
      />
    </Filters>
  );
};
