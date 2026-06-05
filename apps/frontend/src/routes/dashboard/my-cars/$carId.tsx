import { useState } from 'react';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { History, HistoryDataItem } from '@/features/dashboard/widgets/History';
import { activityArray, mockCars } from '@/store/cars';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CalendarCog, CarFront, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DeleteCarConfirm } from '@/features/dashboard/ui/DeleteCarConfirm';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { VehicleSpecs } from '@/features/dashboard/widgets/VehicleSpecs';
import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVehiclesServicesForm';
import { DeleteServiceConfirm } from '@/features/dashboard/ui/DeleteServiceConfirm';

export const Route = createFileRoute('/dashboard/my-cars/$carId')({
  loader: ({ params }) => {
    return mockCars.find((b) => String(b.id) === params.carId);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const car = Route.useLoaderData();
  const navigate = useNavigate();

  if (!car) {
    return (
      <div className="p-8 text-center">
        <p className="text-content-secondary">Nie znaleziono takiego pojazdu.</p>
        <Link to="/dashboard/my-cars" className="text-primary mt-2 inline-block hover:underline">
          Wróć do listy pojazdów
        </Link>
      </div>
    );
  }

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [modalState, setModalState] = useState<boolean | HistoryDataItem | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<HistoryDataItem | null>(null);

  const isServiceModalOpen = !!modalState;
  const isServiceEditMode = typeof modalState === 'object' && modalState !== null;
  const isServiceDeleteModalOpen = !!deleteModalState;

  const editModalTitle = `Edytuj pojazd ${car.brand} ${car.model}`;
  const editModalSubtitle =
    'Zaktualizuj dane techniczne, ubezpieczenia lub numery rejestracyjne tego pojazdu.';

  const handleDelete = async () => {
    try {
      console.log('Usuwanie pojazdu o ID:', car.id);
      // await axios.delete(`/api/vehicles/${car.id}`);
      setIsDeleteModalOpen(false);
      navigate({ to: '/dashboard/my-cars' });
    } catch (error) {
      console.error('Błąd usuwania:', error);
    }
  };

  const singleCarHistory = activityArray.filter((item) => item.vehicleId === String(car.id));

  const totalExpenses = singleCarHistory.reduce((sum, item) => {
    return sum + item.cost;
  }, 0);

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
            <h3 className="pb-[3px]">
              {car.brand} {car.model}
            </h3>
            <p className="text-[14px] text-content-secondary">
              {car.productionYear} · {car.registrationNumber} · {car.fuelType}
            </p>
          </div>
        </div>
        <div className="sm:ml-auto order-1 flex gap-[16px]">
          <BoardButton onClick={() => setIsEditModalOpen(true)} icon="edit" size="small">
            Edytuj
          </BoardButton>
          <BoardButton
            onClick={() => setIsDeleteModalOpen(true)}
            icon="delete"
            variant="danger"
            size="small"
          >
            Usuń
          </BoardButton>
        </div>
      </div>

      {/* 3. SIATKA TRZECH  KAFELKÓW  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="przegląd"
          value={car.technicalInspectionExpiry || ''}
          icon={<CalendarCog size={20} />}
        />

        <DashboardCard
          title="Ubezpieczenie OC"
          value={car.ocExpiry || ''}
          icon={<ShieldAlert size={20} />}
        />

        <DashboardCard
          title="Ubezpieczenie AC"
          value={car.acExpiry || ''}
          icon={<ShieldCheck size={20} />}
        />
      </div>

      {/* 4. HISTORIA SERWISÓW POJEDYŃCZEGO AUTA   + SPECYFIKACJA  */}
      <GridWrapper layout="2-unequal">
        <History
          data={singleCarHistory}
          button={{
            label: 'Dodaj wpis',
            onClick: () => setModalState(true),
          }}
          onEditClick={(item) => setModalState(item)}
          onDeleteClick={(item) => setDeleteModalState(item)}
          title="Historia serwisowa"
        />

        <VehicleSpecs car={car} totalExpenses={totalExpenses} />
      </GridWrapper>

      {/* =========================================================
          M O D A L E   Z A R Z Ą D Z A N I A   P O J A Z D E M
          ========================================================= */}

      {/* MODAL EDYCJI */}
      <Modal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        title={editModalTitle}
        subtitle={editModalSubtitle}
      >
        <AddVehicleForm initialData={car} onClose={() => setIsEditModalOpen(false)} />
      </Modal>

      {/* MODAL USUWANIA */}
      <Modal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        title="Usuń pojazd"
        subtitle="Czy na pewno chcesz usunąć ten pojazd z systemu? Ta operacja jest nieodwracalna."
      >
        <DeleteCarConfirm
          car={car}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      </Modal>

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
            : `Zapisz nową czynność serwisową dla pojazdu ${car.brand}.`
        }
      >
        <AddVehicleServiceForm
          key={isServiceEditMode ? (modalState as HistoryDataItem).id : 'new'}
          onClose={() => setModalState(null)}
          initialData={
            isServiceEditMode
              ? {
                  vehicleId: String(car.id),
                  servicePlace: (modalState as HistoryDataItem).servicePlace,
                  cost: (modalState as HistoryDataItem).cost,
                  serviceType: (modalState as HistoryDataItem).serviceType,
                  serviceDate: (modalState as HistoryDataItem).serviceDate,
                  notes: (modalState as HistoryDataItem).notes,
                  attachment: null,
                }
              : {
                  vehicleId: String(car.id),
                  serviceDate: new Date().toISOString().split('T')[0],
                  serviceType: '',
                  cost: undefined,
                  servicePlace: '',
                  notes: '',
                  attachment: null,
                }
          }
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
              vehicleId: String(car.id),
              serviceType: deleteModalState.notes || 'Czynność serwisowa',
              servicePlace: deleteModalState.servicePlace,
              serviceDate: deleteModalState.serviceDate,
              cost: deleteModalState.cost,
              carBrand: car.brand,
              carModel: car.model,
              registrationNumber: car.registrationNumber,
            }}
            onClose={() => setDeleteModalState(null)}
            onConfirm={async () => {
              try {
                console.log('Usuwanie wpisu o ID:', deleteModalState.id);
                // API: await axios.delete(`/api/services/${deleteModalState.id}`);
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
