import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useVehicles } from '../hooks/vehicles.hooks';
import { VehicleCardCompact } from './VehicleCardCompact';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { Car } from 'lucide-react';

type Props = {
  managerId?: string;
  onDetailsClick: (id: string) => void;
};

export const AssignedVehiclesList = ({ managerId, onDetailsClick }: Props) => {
  const { data, isPending } = useVehicles({
    managerId,
  });
  const vehicles = data?.items ?? [];

  return (
    <div className="flex flex-col gap-7">
      {isPending ? (
        <LoadingIcon className="m-auto my-[24px]" />
      ) : vehicles.length === 0 ? (
        <EmptyPlaceholder
          title="Brak przypisanych samochodów do managera"
          icon={<Car size={24} className="text-primary" />}
        />
      ) : (
        vehicles.map((vehicle) => (
          <VehicleCardCompact key={vehicle.id} vehicle={vehicle} onDetailsClick={onDetailsClick} />
        ))
      )}
    </div>
  );
};
