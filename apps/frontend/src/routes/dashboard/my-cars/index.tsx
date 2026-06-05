import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { mockCars } from '@/store/cars';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { useState } from 'react';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { VehicleCard } from '@/features/dashboard/widgets/VehicleCard';
import { CarFront } from 'lucide-react';

export const Route = createFileRoute('/dashboard/my-cars/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <DashboardHeader
        title="Moje pojazdy"
        subtitle="Zarządzaj wszystkimi pojazdami w jednym miejscu."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => setIsModalOpen(true),
        }}
      />
      {!mockCars || mockCars.length === 0 ? (
        <EmptyPlaceholder
          className="bg-wbg-card min-h-[250px]"
          title="Nie ma tu żadnych pojazdów. Dodaj pierwszy "
          button={{
            label: 'Zobacz wszystko',
            onClick: () => {},
          }}
          icon={<CarFront size={48} className="text-primary" />}
        />
      ) : (
        <GridWrapper layout="3-equal">
          {mockCars.map((item) => (
            <VehicleCard
              key={item.id}
              vehicle={item}
              onDetailsClick={(id) =>
                navigate({
                  to: '/dashboard/my-cars/$carId',
                  params: { carId: String(id) },
                })
              }
            />
          ))}
        </GridWrapper>
      )}

      <Modal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        title="Dodaj pojazd"
        subtitle="Wprowadź dane pojazdu. Pola oznaczone * są wymagane."
      >
        <AddVehicleForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </>
  );
}
