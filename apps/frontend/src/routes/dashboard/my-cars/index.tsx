import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { CarFront, Search } from 'lucide-react';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { VehicleCard } from '@/features/dashboard/widgets/VehicleCard';
import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Pagination } from '@/features/dashboard/ui/Pagination';
import { Select } from '@/features/dashboard/ui/Select';
import { useTeam } from '@/features/dashboard/hooks/team.hooks';

const VEHICLES_PAGE_SIZE = 9;
const SEARCH_DEBOUNCE_MS = 400;

export const Route = createFileRoute('/dashboard/my-cars/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [managerId, setManagerId] = useState<string | null>(null);
  const { data: team } = useTeam();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const managerOptions = useMemo(() => {
    return (team ?? [])
      .filter((person) => person.role === 'MANAGER')
      .map((m, index) => ({
        id: index + 1,
        value: m.id,
        label: `${m.firstName} ${m.lastName}`,
      }));
  }, [team]);

  const { data, isLoading, isError, error, refetch } = useVehicles({
    page,
    pageSize: VEHICLES_PAGE_SIZE,
    search: search || undefined,
    managerId: managerId || undefined,
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

      <GridWrapper layout="3-equal">
        <div className="relative max-w-[400px] ">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Szukaj po marce, modelu lub numerze rejestracyjnym..."
            className="w-full min-h-[45px] rounded-[7px] pl-10 pr-4 border text-[14px] font-medium focus:border-info custom-transition outline-none focus:ring-0 bg-bg-card text-content-primary placeholder:text-icon border-icon"
          />
        </div>

        <Select
          value={managerId ?? ''}
          onChange={(value) => {
            setManagerId(value ? String(value) : null);
            setPage(1);
          }}
          placeholder="-- Wszyscy managerowie --"
          options={managerOptions}
          className="min-w-[220px]"
        />
      </GridWrapper>

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
