import { useEffect, useMemo } from 'react';
import { useVehicles } from '../hooks/vehicles.hooks';
import { Select } from '../ui/Select';
import { Filters } from './Filters';
import { ServicesFiltersType, ServiceType } from '../types';
import { serviceTypeOptions } from '../constants/serviceOptions';
import { useServices } from '../hooks/services.hooks';
import { DateRangePicker } from '../ui/DateRangePicker';

type Props = {
  filters: ServicesFiltersType;
  onChange: (filters: ServicesFiltersType) => void;
};

export const ServicesFilters = ({ filters, onChange }: Props) => {
  const { data: vehiclesData } = useVehicles();
  const { data: servicesData } = useServices();

  const carOptions = useMemo(() => {
    if (!vehiclesData) return [];

    const vehiclesList = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.items ?? []);

    return vehiclesList.map((car) => ({
      id: car.id,
      value: String(car.id),
      label: `${car.brand} ${car.model} (${car.registrationNumber})`,
    }));
  }, [vehiclesData]);

  const providerOptions = useMemo(() => {
    if (!servicesData) return [];

    const servicesList = Array.isArray(servicesData) ? servicesData : (servicesData.items ?? []);

    const uniqueProviders = new Map(
      servicesList.map((service) => [
        service.providerName,
        {
          id: service.id,
          value: service.providerName,
          label: service.providerName,
        },
      ]),
    );

    return Array.from(uniqueProviders.values());
  }, [servicesData]);

  useEffect(() => {
    if (
      filters.providerName &&
      !providerOptions.some((option) => option.value === filters.providerName)
    ) {
      onChange({
        ...filters,
        providerName: null,
      });
    }
  }, [filters, providerOptions, onChange]);

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

      <Select
        value={filters.providerName}
        onChange={(value) =>
          onChange({
            ...filters,
            providerName: value as string | null,
          })
        }
        placeholder="Miejsce usługi"
        options={providerOptions}
        className="w-full"
      />

      <DateRangePicker
        value={{
          from: filters.from,
          to: filters.to,
        }}
        onChange={(range) =>
          onChange({
            ...filters,
            from: range?.from,
            to: range?.to,
          })
        }
        placeholder="Od - Do"
        clearable
        className="w-full"
        maxDate
      />
    </Filters>
  );
};
