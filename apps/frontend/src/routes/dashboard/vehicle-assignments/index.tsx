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
  // 1. Zmieniamy stan na obiekt zarządzający wiadomością i wariantem toastu
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    variant: 'success' | 'error' | 'warning';
  }>({
    isVisible: false,
    message: '',
    variant: 'success',
  });

  const triggerToast = (message: string, variant: 'success' | 'error' | 'warning') => {
    setToast({ isVisible: true, message, variant });
  };

  const handleVehicleAssign = (carId: string | number, userId: string | number) => {
    // 2. SYMULACJA BŁĘDU: Jeśli wybierzesz Marka Nowaka ('marek_nowak'), udajemy błąd serwera
    if (userId === 'marek_nowak') {
      triggerToast('Nie udało się przypisać pojazdu. Brak uprawnień administratora.', 'error');
      return; // Przerywamy funkcję, stan pojazdów się nie zmieni
    }

    // Klasyczny flow dla pozostałych użytkowników (Sukces)
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

    triggerToast('Pojazd został pomyślnie przypisany', 'success');
  };

  return (
    <>
      <DashboardHeader
        title="Przypisania pojazdów"
        subtitle="Przypisuj pojazdy do użytkowników w firmie"
      />
      <NotificationBanner
        variant={toast.variant}
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
        duration={3500}
      />

      <div className="">
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
