import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { CarFront } from 'lucide-react';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { VehicleCard } from '@/features/dashboard/widgets/VehicleCard';
import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Pagination } from '@/features/dashboard/ui/Pagination';

const VEHICLES_PAGE_SIZE = 9;

export const Route = createFileRoute('/dashboard/my-cars/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useVehicles({
    page,
    pageSize: VEHICLES_PAGE_SIZE,
  });
  const vehicles = data?.items ?? [];

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

      {isLoading ? (
        <EmptyPlaceholder
          className="bg-bg-card min-h-[250px]"
          title="Ładowanie pojazdów..."
          icon={<CarFront size={48} className="text-primary" />}
        />
      ) : isError ? (
        <div className="bg-bg-card min-h-[250px] flex flex-col items-center justify-center gap-3 rounded-[7px]">
          <p className="text-alert text-[14px] font-medium">
            {(error as { message?: string })?.message ?? 'Nie udało się pobrać listy pojazdów.'}
          </p>
          <BoardButton onClick={() => refetch()} className="">
            Spróbuj ponownie
          </BoardButton>
        </div>
      ) : vehicles.length === 0 ? (
        <EmptyPlaceholder
          className="bg-bg-card min-h-[250px]"
          title="Nie ma tu żadnych pojazdów. Dodaj pierwszy "
          icon={<CarFront size={48} className="text-primary" />}
        />
      ) : (
        <div className="flex flex-col flex-1">
          <GridWrapper layout="3-equal">
            {vehicles.map((item) => (
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

          <Pagination
            className="mt-auto pt-6"
            currentPage={data?.page ?? page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
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
