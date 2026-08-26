import { useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CalendarCog, CarFront, ShieldAlert, ShieldCheck } from 'lucide-react';

import { useVehicle } from '@/features/dashboard/hooks/vehicles.hooks';
import { useServices } from '@/features/dashboard/hooks/services.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { VehicleData, VehicleFuelType, ServiceData } from '@/features/dashboard/types';

import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { History } from '@/features/dashboard/widgets/History';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { VehicleSpecs } from '@/features/dashboard/widgets/VehicleSpecs';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { DeleteCarConfirm } from '@/features/dashboard/forms/DeleteCarConfirm';
import { DeleteServiceConfirm } from '@/features/dashboard/forms/DeleteServiceConfirm';
import { getVehicle } from '@/features/dashboard/api/vehicles.api';
import { VehicleAssignments } from '@/features/dashboard/widgets/VehicleAssignment';
import { fuelTypeLabels } from '@/features/dashboard/constants/fuelOptions';

const getFuelLabel = (fuelValue?: VehicleFuelType | null) => {
  if (!fuelValue) return 'Nieokreślone';
  return fuelTypeLabels[fuelValue] ?? fuelValue;
};

export const Route = createFileRoute('/dashboard/my-cars/$carId')({
  loader: async ({ params }) => {
    try {
      return await getVehicle(params.carId);
    } catch {
      return null;
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const initialCarData = Route.useLoaderData() as VehicleData | null;
  const { carId } = Route.useParams();
  const navigate = useNavigate();

  const { data: car, isLoading } = useVehicle(carId);
  const currentCar = car ?? initialCarData;

  const { data: servicesResponse } = useServices();
  const { canEditVehicle, canDeleteVehicle } = usePermissions();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalState, setModalState] = useState<boolean | ServiceData | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<ServiceData | null>(null);

  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 5;

  const isServiceEditMode = typeof modalState === 'object' && modalState !== null;

  const singleCarHistory = useMemo(() => {
    if (!currentCar) return [];
    const allServices = servicesResponse?.items ?? [];
    return allServices.filter(
      (item) => item.vehicleId === currentCar.id || item.vehicle?.id === currentCar.id,
    );
  }, [servicesResponse, currentCar]);

  const totalExpenses = useMemo(
    () => singleCarHistory.reduce((sum, item) => sum + (Number(item.cost) || 0), 0),
    [singleCarHistory],
  );

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return singleCarHistory.slice(start, start + HISTORY_PAGE_SIZE);
  }, [singleCarHistory, historyPage]);

  const totalHistoryPages = Math.max(1, Math.ceil(singleCarHistory.length / HISTORY_PAGE_SIZE));

  // const serviceInitialData = useMemo(() => {
  //   if (!currentCar) return undefined;

  //   if (isServiceEditMode) {
  //     return modalState as ServiceData;
  //   }

  //   return undefined;
  // }, [modalState, isServiceEditMode, currentCar]);

  if (isLoading && !currentCar) {
    return (
      <EmptyPlaceholder
        className="bg-bg-card min-h-[250px]"
        title="Ładowanie danych pojazdu..."
        icon={<CarFront size={48} className="text-primary" />}
      />
    );
  }

  if (!currentCar) {
    return (
      <div className="p-8 bg-bg-card flex flex-column justify-center items-center ">
        <p className="text-content-secondary">Nie znaleziono takiego pojazdu.</p>
        <Link to="/dashboard/my-cars" className="text-primary mt-2 inline-block hover:underline">
          Wróć do listy pojazdów
        </Link>
      </div>
    );
  }

  const isServiceModalOpen = !!modalState;
  const isServiceDeleteModalOpen = !!deleteModalState;

  const editModalTitle = `Edytuj pojazd ${currentCar.brand} ${currentCar.model}`;
  const editModalSubtitle =
    'Zaktualizuj dane techniczne, ubezpieczenia lub numery rejestracyjne tego pojazdu.';

  return (
    <>
      {/* 1. LINK POWROTNY */}
      <Link
        to="/dashboard/my-cars"
        className="w-fit flex items-center gap-[8px] text-[12px] text-content-secondary"
      >
        <ArrowLeft size={18} />
        Wróć do pojazdów
      </Link>

      {/* 2. NAGŁÓWEK Z DANYMI AUTA  */}
      <div className="grid sm:grid-cols-2 grid-cols-1 gap-[16px]">
        <div className="flex gap-[16px] items-center shrink-0">
          <IconWrapper className="xl:w-[60px] xl:h-[60px] w-[50px] h-[50px]  bg-secondary">
            <CarFront className="text-white" />
          </IconWrapper>
          <div className="">
            <h3 className="pb-[3px] capitalize">
              {currentCar.brand} {currentCar.model}
            </h3>
            <p className="text-[14px] text-content-secondary uppercase">
              {currentCar.productionYear ?? ''} · {currentCar.registrationNumber} ·{' '}
              {getFuelLabel(currentCar.fuelType)}
            </p>
          </div>
        </div>
        <div className="sm:ml-auto order-1 flex gap-[16px]">
          {canEditVehicle && (
            <BoardButton onClick={() => setIsEditModalOpen(true)} icon="edit" size="small">
              Edytuj
            </BoardButton>
          )}
          {canDeleteVehicle && (
            <BoardButton
              onClick={() => setIsDeleteModalOpen(true)}
              icon="delete"
              variant="danger"
              size="small"
            >
              Usuń
            </BoardButton>
          )}
        </div>
      </div>

      {/* 3. SIATKA TRZECH  KAFELKÓW  */}
      <GridWrapper layout={'3-equal'}>
        <DashboardCard
          title="przegląd"
          value={currentCar.technicalInspectionExpiry || ''}
          icon={<CalendarCog size={20} />}
        />

        <DashboardCard
          title="Ubezpieczenie OC"
          value={currentCar.ocExpiry || ''}
          icon={<ShieldAlert size={20} />}
        />

        <DashboardCard
          title="Ubezpieczenie AC"
          value={currentCar.acExpiry || ''}
          icon={<ShieldCheck size={20} />}
        />
      </GridWrapper>

      {/* 4. HISTORIA SERWISÓW POJEDYŃCZEGO AUTA   + SPECYFIKACJA  */}
      <GridWrapper layout="2-unequal">
        <History
          title="Historia serwisowa"
          data={paginatedHistory}
          link={{
            label: 'Zobacz pełną historię',
            href: '/dashboard/service',
          }}
          button={{
            label: 'Dodaj wpis',
            onClick: () => setModalState(true),
          }}
          onEditClick={(item) => setModalState(item)}
          onDeleteClick={(item) => setDeleteModalState(item)}
          pagination={{
            currentPage: historyPage,
            totalPages: totalHistoryPages,
            onPageChange: setHistoryPage,
          }}
        />

        <GridWrapper>
          <VehicleSpecs car={currentCar} totalExpenses={totalExpenses} />
          <VehicleAssignments vehicle={currentCar} />
        </GridWrapper>
      </GridWrapper>

      {/* =========================================================
          M O D A L E   Z A R Z Ą D Z A N I A   P O J A Z D E M
          ========================================================= */}

      {canEditVehicle && (
        <Modal
          isOpen={isEditModalOpen}
          setIsOpen={setIsEditModalOpen}
          title={editModalTitle}
          subtitle={editModalSubtitle}
        >
          <AddVehicleForm initialData={currentCar} onClose={() => setIsEditModalOpen(false)} />
        </Modal>
      )}

      {canDeleteVehicle && (
        <Modal
          isOpen={isDeleteModalOpen}
          setIsOpen={setIsDeleteModalOpen}
          title="Usuń pojazd"
          subtitle="Czy na pewno chcesz usunąć ten pojazd z systemu? Ta operacja jest nieodwracalna."
        >
          <DeleteCarConfirm
            car={currentCar}
            onClose={() => setIsDeleteModalOpen(false)}
            onDeleted={() => navigate({ to: '/dashboard/my-cars' })}
          />
        </Modal>
      )}

      {/* =========================================================
          M O D A L E   Z A R Z Ą D Z A N I A   S E R W I S A M I
          ========================================================= */}

      <Modal
        isOpen={isServiceModalOpen}
        setIsOpen={() => setModalState(null)}
        title={isServiceEditMode ? 'Edytuj wpis serwisowy' : 'Dodaj wpis serwisowy'}
        subtitle={
          isServiceEditMode
            ? 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.'
            : `Zapisz nową czynność serwisową dla pojazdu ${currentCar.brand}..`
        }
      >
        <div className="">
          {/* <AddVehicleServiceForm
            key={isServiceEditMode ? (modalState as ServiceData).id : 'new'}
            onClose={() => setModalState(null)}
            initialData={serviceInitialData}
          /> */}
        </div>
      </Modal>

      <Modal
        isOpen={isServiceDeleteModalOpen}
        setIsOpen={() => setDeleteModalState(null)}
        title="Usuń wpis serwisowy"
        subtitle="Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna."
      >
        {deleteModalState && (
          <DeleteServiceConfirm
            service={deleteModalState}
            onClose={() => setDeleteModalState(null)}
          />
        )}
      </Modal>
    </>
  );
}
