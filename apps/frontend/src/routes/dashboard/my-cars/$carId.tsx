import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CalendarCog, CarFront, ShieldAlert, ShieldCheck } from 'lucide-react';

import { useVehicle } from '@/features/dashboard/hooks/vehicles.hooks';
import { useServices } from '@/features/dashboard/hooks/services.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { VehicleData, VehicleFuelType } from '@/features/dashboard/types';
import { useVehicleAlertsForCar } from '@/features/dashboard/hooks/useVehicleAlerts';

import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { History } from '@/features/dashboard/widgets/History';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { VehicleSpecs } from '@/features/dashboard/widgets/VehicleSpecs';
import { getVehicle } from '@/features/dashboard/api/vehicles.api';
import { VehicleAssignments } from '@/features/dashboard/widgets/VehicleAssignment';
import { fuelTypeLabels } from '@/features/dashboard/constants/fuelOptions';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useServiceModal } from '@/features/dashboard/hooks/useServiceModal';
import { useVehiclesModal } from '@/features/dashboard/hooks/useVehiclesModal';
import { getDeadlineCardVisual } from '@/utils/formatDeadline';

const getFuelLabel = (fuelValue?: VehicleFuelType | null) => {
  if (!fuelValue) return 'Nieokreślone';
  return fuelTypeLabels[fuelValue] ?? fuelValue;
};

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
  const { openModal: openServiceModal, ServiceModal } = useServiceModal();
  const { openModal: openVehicleModal, VehiclesModal } = useVehiclesModal();

  const initialCarData = Route.useLoaderData() as VehicleData | null;
  const { carId } = Route.useParams();
  const { data: car, isLoading } = useVehicle(carId);
  const { data: servicesResponse } = useServices();
  const { canEditVehicle, canDeleteVehicle } = usePermissions();

  const [historyPage, setHistoryPage] = useState(1);

  const currentCar = car ?? initialCarData;

  const { byKind: alertsByKind } = useVehicleAlertsForCar(carId);

  const inspectionCard = useMemo(
    () =>
      getDeadlineCardVisual(
        'przegląd',
        'TECHNICAL_INSPECTION',
        currentCar?.technicalInspectionExpiry,
        alertsByKind.get('TECHNICAL_INSPECTION'),
      ),
    [currentCar?.technicalInspectionExpiry, alertsByKind],
  );

  const ocCard = useMemo(
    () =>
      getDeadlineCardVisual('Ubezpieczenie OC', 'OC', currentCar?.ocExpiry, alertsByKind.get('OC')),
    [currentCar?.ocExpiry, alertsByKind],
  );

  const acCard = useMemo(
    () =>
      getDeadlineCardVisual('Ubezpieczenie AC', 'AC', currentCar?.acExpiry, alertsByKind.get('AC')),
    [currentCar?.acExpiry, alertsByKind],
  );

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

  if (isLoading && !currentCar) {
    return <LoadingIcon className="m-auto my-16" />;
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
      <Link
        to="/dashboard/my-cars"
        className="w-fit flex items-center gap-[8px] text-[12px] text-content-secondary"
      >
        <ArrowLeft size={18} />
        Wróć do pojazdów
      </Link>

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
            <BoardButton
              onClick={() => openVehicleModal('edit_car', currentCar)}
              icon="edit"
              size="small"
            >
              Edytuj
            </BoardButton>
          )}
          {canDeleteVehicle && (
            <BoardButton
              onClick={() => openVehicleModal('delete_car', currentCar)}
              icon="delete"
              variant="danger"
              size="small"
            >
              Usuń
            </BoardButton>
          )}
        </div>
      </div>

      <GridWrapper layout={'3-equal'}>
        <DashboardCard
          title={inspectionCard.title}
          value={inspectionCard.value}
          variant={inspectionCard.variant}
          icon={<CalendarCog size={20} />}
        />

        <DashboardCard
          title={ocCard.title}
          value={ocCard.value}
          variant={ocCard.variant}
          icon={<ShieldAlert size={20} />}
        />

        <DashboardCard
          title={acCard.title}
          value={acCard.value}
          variant={acCard.variant}
          icon={<ShieldCheck size={20} />}
        />
      </GridWrapper>

      <GridWrapper layout="2-unequal">
        <History
          title="Historia serwisowa"
          data={paginatedHistory}
          link={{ label: 'Zobacz pełną historię', href: '/dashboard/service' }}
          button={{
            label: 'Dodaj wpis',
            onClick: () => openServiceModal('add_service', car),
          }}
          onEditClick={(service) => openServiceModal('edit_service', service.id, car)}
          onDeleteClick={(service) => openServiceModal('delete_service', service.id)}
          pagination={{
            currentPage: historyPage,
            totalPages: totalHistoryPages,
            onPageChange: setHistoryPage,
          }}
        />

        <div className="flex flex-col gap-4 sm:gap-6">
          <VehicleSpecs car={currentCar} totalExpenses={totalExpenses} />
          <VehicleAssignments vehicle={currentCar} />
        </div>
      </GridWrapper>

      {ServiceModal}
      {VehiclesModal}
    </>
  );
}
