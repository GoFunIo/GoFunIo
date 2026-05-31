import { createFileRoute } from '@tanstack/react-router';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { VehicleAssignmentCard } from '@/features/dashboard/widgets/VehicleAssignmentCard';
import { carsArr as initialCars } from '@/store/cars';
import { useState } from 'react';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { NotificationBanner } from '../../../features/dashboard/ui/NotificationBanner';

const USERS_MOCK = [
  { id: 1, value: 'marek_nowak', label: 'Marek Nowak (admin@autokeep.pl)' },
  { id: 2, value: 'jan_kowalski', label: 'Jan Kowalski (jan.k@gmail.com)' },
  { id: 3, value: 'anna_nowak', label: 'Anna Nowak (anna.n@outlook.com)' },
];

export const Route = createFileRoute('/dashboard/vehicle-assignments/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [vehicles, setVehicles] = useState(initialCars);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleVehicleAssign = (carId: string | number, userId: string | number) => {
    const targetUser = USERS_MOCK.find((user) => user.value === userId);
    const formattedName = targetUser ? targetUser.label.split(' (')[0] : String(userId);

    setVehicles((prevVehicles) =>
      prevVehicles.map((car) => {
        if (car.id === carId) {
          return {
            ...car,
            currentOwner: formattedName,
          };
        }
        return car;
      }),
    );

    setShowSuccess(true);
  };

  return (
    <>
      <DashboardHeader
        title="Przypisania pojazdów"
        subtitle="Przypisuj pojazdy do użytkowników w firmie"
      />
      <NotificationBanner
        message="Pojazd przypisany"
        isVisible={showSuccess}
        onClose={() => setShowSuccess(false)}
        duration={3500}
      />

      <div className="pt-8">
        {vehicles.length === 0 ? (
          <div className="text-center py-12 text-content-secondary border border-dashed border-icon rounded-[8px] bg-white">
            Brak pojazdów do przypisania.
          </div>
        ) : (
          <GridWrapper layout="3-equal">
            {vehicles.map((car) => (
              <VehicleAssignmentCard
                key={car.id}
                vehicle={car}
                users={USERS_MOCK}
                onAssign={handleVehicleAssign}
              />
            ))}
          </GridWrapper>
        )}
      </div>
    </>
  );
}
