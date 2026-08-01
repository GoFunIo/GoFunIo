import { useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CalendarCog, CarFront, ShieldAlert, ShieldCheck } from 'lucide-react';

import { useVehicle } from '@/features/dashboard/hooks/vehicles.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { VehicleData } from '@/features/dashboard/types';

import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { History, HistoryDataItem } from '@/features/dashboard/widgets/History';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { VehicleSpecs } from '@/features/dashboard/widgets/VehicleSpecs';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { DeleteCarConfirm } from '@/features/dashboard/forms/DeleteCarConfirm';
import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVehiclesServicesForm';
import { DeleteServiceConfirm } from '@/features/dashboard/forms/DeleteServiceConfirm';
import { getVehicle } from '@/features/dashboard/api/vehicles.api';
import { activityArray } from '@/store/cars';
import { VehicleAssignments } from '@/features/dashboard/widgets/VehicleAssignment';

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

  const { data: car, isLoading, refetch } = useVehicle(carId);
  const currentCar = car ?? initialCarData;

  const { canEditVehicle, canDeleteVehicle } = usePermissions();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [modalState, setModalState] = useState<boolean | HistoryDataItem | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<HistoryDataItem | null>(null);

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
  const isServiceEditMode = typeof modalState === 'object' && modalState !== null;
  const isServiceDeleteModalOpen = !!deleteModalState;

  const editModalTitle = `Edytuj pojazd ${currentCar.brand} ${currentCar.model}`;
  const editModalSubtitle =
    'Zaktualizuj dane techniczne, ubezpieczenia lub numery rejestracyjne tego pojazdu.';

  const singleCarHistory = activityArray.filter((item) => item.vehicleId === String(currentCar.id));

  const totalExpenses = singleCarHistory.reduce((sum, item) => {
    return sum + item.cost;
  }, 0);

  const serviceInitialData = useMemo(() => {
    if (isServiceEditMode) {
      const editItem = modalState as HistoryDataItem;
      return {
        vehicleId: String(currentCar.id),
        servicePlace: editItem.servicePlace,
        cost: editItem.cost,
        serviceType: editItem.serviceType,
        serviceDate: editItem.serviceDate,
        notes: editItem.notes,
        attachment: undefined,
      };
    }
    return {
      vehicleId: String(currentCar.id),
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: '',
      cost: undefined,
      servicePlace: '',
      notes: '',
      attachment: undefined,
    };
  }, [modalState, isServiceEditMode, currentCar.id]);

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
            <p className="text-[14px] text-content-secondary">
              {currentCar.productionYear ?? ''} · {currentCar.registrationNumber} ·{' '}
              {currentCar.fuelType ?? 'Nieokreślone'}
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
          data={singleCarHistory}
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
          title="Historia serwisowa"
        />

        <GridWrapper>
          <VehicleSpecs car={currentCar} totalExpenses={totalExpenses} />
          <VehicleAssignments vehicle={currentCar} />
        </GridWrapper>
      </GridWrapper>

      {/* =========================================================
          M O D A L E   Z A R Z Ą D Z A N I A   P O J A Z D E M
          ========================================================= */}

      {/* MODAL EDYCJI */}
      {canEditVehicle && (
        <Modal
          isOpen={isEditModalOpen}
          setIsOpen={setIsEditModalOpen}
          title={editModalTitle}
          subtitle={editModalSubtitle}
        >
          <AddVehicleForm
            initialData={currentCar}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={() => refetch()}
          />
        </Modal>
      )}

      {/* MODAL USUWANIA */}
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

      {/* MODAL 1: DODAWANIE / EDYCJA WPISU SERWISOWEGO */}
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
        <AddVehicleServiceForm
          key={isServiceEditMode ? (modalState as HistoryDataItem).id : 'new'}
          onClose={() => setModalState(null)}
          initialData={serviceInitialData}
        />
      </Modal>

      {/* MODAL 2: POTWIERDZENIE USUWANIA WPISU SERWISOWEGO */}
      <Modal
        isOpen={isServiceDeleteModalOpen}
        setIsOpen={() => setDeleteModalState(null)}
        title="Usuń wpis serwisowy"
        subtitle="Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna."
      >
        {deleteModalState && (
          <DeleteServiceConfirm
            service={{
              id: deleteModalState.id,
              vehicleId: String(currentCar.id),
              serviceType: deleteModalState.notes || 'Czynność serwisowa',
              servicePlace: deleteModalState.servicePlace,
              serviceDate: deleteModalState.serviceDate,
              cost: deleteModalState.cost,
              carBrand: currentCar.brand,
              carModel: currentCar.model,
              registrationNumber: currentCar.registrationNumber,
            }}
            onClose={() => setDeleteModalState(null)}
            onConfirm={async () => {
              try {
                console.log('Usuwanie wpisu o ID:', deleteModalState.id);
                setDeleteModalState(null);
              } catch (error) {
                console.error('Błąd podczas usuwania wpisu:', error);
              }
            }}
          />
        )}
      </Modal>
    </>
  );
}
