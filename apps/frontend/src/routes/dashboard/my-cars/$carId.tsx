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
import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVehiclesServicesForm';
import { DeleteServiceConfirm } from '@/features/dashboard/forms/DeleteServiceConfirm';
import { getVehicle } from '@/features/dashboard/api/vehicles.api';
import { VehicleAssignments } from '@/features/dashboard/widgets/VehicleAssignment';
import { fuelTypeLabels } from '@/features/dashboard/constants/fuelOptions';

const getFuelLabel = (fuelValue?: VehicleFuelType | null) => {
  if (!fuelValue) return 'Nieokreślone';
  return fuelTypeLabels[fuelValue] ?? fuelValue;
};

type ModalType =
  | 'edit_car'
  | 'delete_car'
  | 'add_service'
  | 'edit_service'
  | 'delete_service'
  | null;

const HISTORY_PAGE_SIZE = 5;

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
  const navigate = useNavigate();

  const initialCarData = Route.useLoaderData() as VehicleData | null;
  const { carId } = Route.useParams();

  const { data: car, isLoading } = useVehicle(carId);
  const { data: servicesResponse } = useServices();
  const { canEditVehicle, canDeleteVehicle } = usePermissions();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const currentCar = car ?? initialCarData;

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

  const handleEditCarClick = () => {
    setActiveModal('edit_car');
  };

  const handleDeleteCarClick = () => {
    setActiveModal('delete_car');
  };

  const handleAddServiceClick = () => {
    setSelectedService(null);
    setActiveModal('add_service');
  };

  const handleEditServiceClick = (item: ServiceData) => {
    setSelectedService(item);
    setActiveModal('edit_service');
  };

  const handleDeleteServiceClick = (item: ServiceData) => {
    setSelectedService(item);
    setActiveModal('delete_service');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedService(null);
  };

  const getModalConfig = () => {
    if (!currentCar) return { title: '', subtitle: '', content: null };

    switch (activeModal) {
      case 'edit_car':
        return {
          title: `Edytuj pojazd ${currentCar.brand} ${currentCar.model}`,
          subtitle:
            'Zaktualizuj dane techniczne, ubezpieczenia lub numery rejestracyjne tego pojazdu.',
          content: <AddVehicleForm initialData={currentCar} onClose={closeModal} />,
        };

      case 'delete_car':
        return {
          title: 'Usuń pojazd',
          subtitle:
            'Czy na pewno chcesz usunąć ten pojazd z systemu? Ta operacja jest nieodwracalna.',
          content: (
            <DeleteCarConfirm
              car={currentCar}
              onClose={closeModal}
              onDeleted={() => navigate({ to: '/dashboard/my-cars' })}
            />
          ),
        };

      case 'add_service':
        return {
          title: 'Dodaj wpis serwisowy',
          subtitle: `Zapisz nową czynność serwisową dla pojazdu ${currentCar.brand}.`,
          content: <AddVehicleServiceForm onClose={closeModal} />,
        };

      case 'edit_service':
        if (!selectedService) return { title: '', subtitle: '', content: null };

        return {
          title: 'Edytuj wpis serwisowy',
          subtitle: 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.',
          content: (
            <AddVehicleServiceForm
              key={selectedService.id}
              initialData={selectedService}
              onClose={closeModal}
            />
          ),
        };

      case 'delete_service':
        if (!selectedService) return { title: '', subtitle: '', content: null };

        return {
          title: 'Usuń wpis serwisowy',
          subtitle:
            'Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna.',
          content: <DeleteServiceConfirm service={selectedService} onClose={closeModal} />,
        };

      default:
        return { title: '', subtitle: '', content: null };
    }
  };

  const modalConfig = getModalConfig();

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
            <BoardButton onClick={handleEditCarClick} icon="edit" size="small">
              Edytuj
            </BoardButton>
          )}
          {canDeleteVehicle && (
            <BoardButton onClick={handleDeleteCarClick} icon="delete" variant="danger" size="small">
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
          link={{ label: 'Zobacz pełną historię', href: '/dashboard/service' }}
          button={{ label: 'Dodaj wpis', onClick: handleAddServiceClick }}
          onEditClick={handleEditServiceClick}
          onDeleteClick={handleDeleteServiceClick}
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

      <Modal
        isOpen={activeModal !== null}
        setIsOpen={(isOpen) => !isOpen && closeModal()}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
      >
        {modalConfig.content}
      </Modal>
    </>
  );
}
