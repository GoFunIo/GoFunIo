import { useMemo, useState } from 'react';
import { createFileRoute, Link, ToOptions, useNavigate } from '@tanstack/react-router';
import { CarFront, LucideIcon, ShieldAlert, TriangleAlert, Users, Wrench } from 'lucide-react';

import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';

import { calculateDaysToDate } from '@/utils/calculateDaysToDate';

import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { ActionButton } from '@/features/dashboard/ui/ActionButton';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { AdminAlertBucket } from '@/features/dashboard/widgets/AdminAlertBucket';
import { Banner } from '@/features/dashboard/widgets/Banner';
import { History, HistoryDataItem, serviceTypeLabels } from '@/features/dashboard/widgets/History';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVehiclesServicesForm';
import { AddEditUserForm } from '@/features/dashboard/forms/AddEditUserForm';
import {
  DeleteServiceConfirm,
  ServiceEntryType,
} from '@/features/dashboard/forms/DeleteServiceConfirm';
import { VehicleData } from '@/features/dashboard/types';
import { getUserFullName } from '@/utils/getUserFullName';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { actionsArray, activityArray } from '@/store/cars';
import { useUser } from '@/features/dashboard/hooks/user.hooks';
import { useTeam } from '@/features/dashboard/hooks/team.hooks';

type QuickAction = {
  id: number;
  title: string;
  icon: LucideIcon;
  actionType: 'modal_car' | 'modal_user' | 'modal_service' | 'link';
  href?: ToOptions['to'];
};

const typedActions = actionsArray as unknown as QuickAction[];

type DayBucketKey = 'days7' | 'days30' | 'days60';
type DayBuckets = Record<DayBucketKey, number>;

const bucketKey = (days: number): DayBucketKey | null => {
  if (days <= 7) return 'days7';
  if (days <= 30) return 'days30';
  if (days <= 60) return 'days60';
  return null;
};

export const Route = createFileRoute('/dashboard/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const {
    data: vehiclesResponse,
    isPending: isVehiclesPending,
    refetch: refetchVehicles,
  } = useVehicles();
  const { data: team, isPending: isTeamPending } = useTeam();

  const isTeamLoading = isTeamPending && user?.role === 'ADMIN';

  const vehicles: VehicleData[] = vehiclesResponse?.items ?? [];

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<boolean | HistoryDataItem | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<HistoryDataItem | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditCarModalOpen, setIsEditCarModalOpen] = useState<boolean>(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);

  const isServiceEditMode = typeof modalState === 'object' && modalState !== null;

  const selectedCar = vehicles.find((c) => c.id === selectedCarId);

  const editCarModalTitle = selectedCar
    ? `Edytuj pojazd ${selectedCar.brand} ${selectedCar.model}`
    : 'Edytuj dane pojazdu';

  const handleRenewCar = (id: string) => {
    setSelectedCarId(id);
    setIsEditCarModalOpen(true);
  };

  // LOGIKA PRZEGLĄDÓW
  const inspectionStats = useMemo(
    () =>
      vehicles.reduce<DayBuckets>(
        (acc, car) => {
          if (!car.technicalInspectionExpiry) return acc;
          const key = bucketKey(calculateDaysToDate(car.technicalInspectionExpiry).days);
          if (key) acc[key]++;
          return acc;
        },
        { days7: 0, days30: 0, days60: 0 },
      ),
    [vehicles],
  );

  // LOGIKA OC / AC
  const insuranceStats = useMemo(
    () =>
      vehicles.reduce<DayBuckets>(
        (acc, car) => {
          if (car.ocExpiry) {
            const key = bucketKey(calculateDaysToDate(car.ocExpiry).days);
            if (key) acc[key]++;
          }
          if (car.acExpiry) {
            const key = bucketKey(calculateDaysToDate(car.acExpiry).days);
            if (key) acc[key]++;
          }
          return acc;
        },
        { days7: 0, days30: 0, days60: 0 },
      ),
    [vehicles],
  );

  const totalUrgentReminders =
    inspectionStats.days7 + inspectionStats.days30 + insuranceStats.days7 + insuranceStats.days30;

  const adminStats = {
    totalFleetVehicles: vehiclesResponse?.total ?? vehicles.length,
    activeUsersCount: team?.length ?? 0,
    urgentReminders: totalUrgentReminders,
  };

  const handleActionClick = (
    actionType: 'modal_car' | 'modal_user' | 'modal_service' | 'link',
    href?: ToOptions['to'],
  ) => {
    if (actionType === 'link' && href) {
      navigate({ to: href });
      return;
    }
    if (actionType === 'modal_car') {
      setIsModalOpen(true);
      return;
    }
    if (actionType === 'modal_user') {
      setIsUserModalOpen(true);
      return;
    }
    if (actionType === 'modal_service') {
      setIsServiceModalOpen(true);
      return;
    }
  };

  // Podsumowanie wydatków — nadal na mocku, brak endpointu historii serwisowej w przesłanych hookach
  const expensesSummary = useMemo(() => {
    let servicesAndRepairs = 0;
    let insurance = 0;

    (activityArray as HistoryDataItem[]).forEach((item) => {
      if (item.serviceType === 'insurance_oc' || item.serviceType === 'insurance_ac') {
        insurance += item.cost;
      } else {
        servicesAndRepairs += item.cost;
      }
    });

    return {
      servicesAndRepairs,
      insurance,
      total: servicesAndRepairs + insurance,
    };
  }, []);

  const serviceInitialData = useMemo(() => {
    if (isServiceEditMode) {
      const editItem = modalState as HistoryDataItem;
      return {
        vehicleId: editItem.vehicleId,
        servicePlace: editItem.servicePlace,
        cost: editItem.cost,
        serviceType: editItem.serviceType,
        serviceDate: editItem.serviceDate,
        notes: editItem.notes,
        attachment: undefined,
      };
    }
    return undefined;
  }, [modalState, isServiceEditMode]);

  const limitedActivityHistory = useMemo(() => {
    return (activityArray as HistoryDataItem[]).slice(0, 5);
  }, []);

  if (!user) return null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full ">
        <div className="lg:col-span-6">
          <DashboardHeader
            title={`Hello, ${getUserFullName(user.firstName, user.lastName, user.email)}`}
            subtitle="Oto, co dzieje się z Twoją flotą dzisiaj."
          />
        </div>
        <div className="lg:col-span-6">
          <Banner
            size="small"
            variant="warning"
            title="Okres próbny: pozostało 2 dni"
            subtitle="Aktywuj plan, aby nie stracić dostępu"
          />
        </div>
      </div>

      {/* KARTY STATYSTYK */}
      <GridWrapper layout={'3-equal'}>
        <Link to="/dashboard/my-cars" className="block no-underline">
          <DashboardCard
            title="Pojazdy we flocie"
            value={isVehiclesPending ? '...' : adminStats.totalFleetVehicles}
            subtitle="aktywne"
            icon={<CarFront size={20} />}
          />
        </Link>
        <Link to="/dashboard/settings/users" className="block no-underline">
          <DashboardCard
            title="Aktywni użytkownicy"
            value={isTeamLoading ? '...' : adminStats.activeUsersCount}
            subtitle="osoby mają pojazdy w systemie"
            icon={<Users size={20} />}
          />
        </Link>

        <Link to="/dashboard/notifications" className="block no-underline">
          <DashboardCard
            title="Pilne przypomnienia"
            value={isVehiclesPending ? '...' : adminStats.urgentReminders}
            subtitle="działania wymagane w ciągu 30 dni"
            icon={<TriangleAlert size={20} />}
            isAlert={true}
          />
        </Link>
      </GridWrapper>

      {/* NADCHODZĄCE TERMINY */}
      <BlockWrapper>
        <div className="mb-6">
          <p className="text-[18px] text-content-primary font-semibold mb-2">Nadchodzące terminy</p>
          <p className="text-[14px] text-content-secondary">
            Liczba pojazdów wymagających uwagi w najbliższym czasie
          </p>
        </div>

        {isVehiclesPending ? (
          <LoadingIcon className="m-auto" />
        ) : (
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-6">
            <div className="flex flex-col gap-4">
              <AdminAlertBucket
                title="Przeglądy techniczne"
                icon={Wrench}
                stats={inspectionStats}
              />
              <Reminders
                data={vehicles}
                filterType="inspection"
                onRenewCar={handleRenewCar}
                maxDays={30}
              />
            </div>

            <div className="flex flex-col gap-4">
              <AdminAlertBucket
                title="Ubezpieczenia (OC / AC)"
                icon={ShieldAlert}
                stats={insuranceStats}
              />
              <Reminders
                data={vehicles}
                filterType="insurance"
                onRenewCar={handleRenewCar}
                maxDays={30}
              />
            </div>
          </div>
        )}
      </BlockWrapper>

      <GridWrapper layout="2-unequal">
        {/* HISTORIA SERWISOWA — nadal mock, brak endpointu w przesłanych plikach */}
        <History
          data={limitedActivityHistory}
          link={{
            label: 'Zobacz pełną historię',
            href: '/dashboard/service',
          }}
          onEditClick={(item) => setModalState(item)}
          onDeleteClick={(item) => setDeleteModalState(item)}
          title="Ostatnia aktywność"
        />

        {/* SZYBKIE AKCJE PRAWA STRONA */}
        <div className=" flex flex-col gap-6">
          <BlockWrapper className="lg:col-span-1 h-fit">
            <h4 className="text-content-primary ">Szybkie akcje</h4>

            <div className="flex flex-col gap-[12px] pt-6 ">
              {typedActions.map((item) => (
                <ActionButton
                  key={item.id}
                  title={item.title}
                  icon={item.icon}
                  onClick={() => handleActionClick(item.actionType, item.href)}
                />
              ))}
            </div>
          </BlockWrapper>
          <BlockWrapper>
            <h4 className="text-content-primary mb-6">Podsumowanie wydatków</h4>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-[14px]">
                <div className="flex items-center gap-4 text-content-primary">
                  <Wrench size={16} className="text-content-primary" />
                  <span>Serwisy i naprawy</span>
                </div>
                <span className="font-bold text-content-primary">
                  {expensesSummary.servicesAndRepairs.toFixed(2)} zł
                </span>
              </div>

              <div className="flex justify-between items-center text-[14px]">
                <div className="flex items-center gap-4 text-content-primary">
                  <ShieldAlert size={16} className="text-content-primary" />
                  <span>Ubezpieczenia</span>
                </div>
                <span className="font-bold text-content-primary">
                  {expensesSummary.insurance.toFixed(2)} zł
                </span>
              </div>

              <hr className="border-t border-icon my-4" />
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-bold text-content-primary">Suma wydatków</span>
                <span className="text-[16px] font-black text-content-primary">
                  {expensesSummary.total.toFixed(2)} zł
                </span>
              </div>
            </div>
          </BlockWrapper>
        </div>
      </GridWrapper>

      {/* MODAL 1: DODANIE SAMOCHODU */}
      <Modal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        title="Dodaj pojazd"
        subtitle="Wprowadź dane pojazdu. Pola oznaczone * są wymagane."
      >
        <AddVehicleForm onClose={() => setIsModalOpen(false)} onSuccess={() => refetchVehicles()} />
      </Modal>

      {/* MODAL 1a: EDYCJA DANYCH SAMOCHODU */}
      <Modal
        isOpen={isEditCarModalOpen}
        setIsOpen={setIsEditCarModalOpen}
        title={editCarModalTitle}
        subtitle="Zaktualizuj ubezpieczenia lub badania techniczne pojazdu."
      >
        <AddVehicleForm
          initialData={selectedCar}
          onClose={() => setIsEditCarModalOpen(false)}
          isRenewalMode={true}
        />
      </Modal>

      {/* MODAL 2: DODAJ WPIS SERWISOWY */}
      <Modal
        isOpen={isServiceModalOpen}
        setIsOpen={setIsServiceModalOpen}
        title="Dodaj wpis serwisowy"
        subtitle="Wprowadź szczegóły wykonanej naprawy lub serwisu."
      >
        <div className=" text-center text-content-secondary">
          <AddVehicleServiceForm onClose={() => setIsServiceModalOpen(false)} />
        </div>
      </Modal>

      {/* MODAL 3: DODAJ UŻYTKOWNIKA */}
      <Modal
        isOpen={isUserModalOpen}
        setIsOpen={setIsUserModalOpen}
        title="Dodaj użytkownika"
        subtitle="Wprowadź dane nowego kierowcy lub administratora systemu."
      >
        <AddEditUserForm onClose={() => setIsUserModalOpen(false)} />
      </Modal>

      {/* MODAL 4: EDYCJA WPISU SERWISOWEGO */}
      <Modal
        isOpen={isServiceEditMode}
        setIsOpen={(open) => !open && setModalState(null)}
        title="Edytuj wpis serwisowy"
        subtitle="Zaktualizuj szczegóły, koszt lub miejsce wykonania usługi."
      >
        <AddVehicleServiceForm
          key={isServiceEditMode ? (modalState as HistoryDataItem).id : 'edit-none'}
          initialData={serviceInitialData}
          onClose={() => setModalState(null)}
        />
      </Modal>

      {/* MODAL 5: USUNIĘCIE WPISU SERWISOWEGO */}
      <Modal
        isOpen={!!deleteModalState}
        setIsOpen={(open) => !open && setDeleteModalState(null)}
        title="Usuń wpis serwisowy"
        subtitle="Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna."
      >
        {deleteModalState && (
          <DeleteServiceConfirm
            service={
              {
                id: deleteModalState.id,
                vehicleId: deleteModalState.vehicleId,
                serviceType:
                  serviceTypeLabels[deleteModalState.serviceType] || 'Czynność serwisowa',
                servicePlace: deleteModalState.servicePlace,
                serviceDate: deleteModalState.serviceDate,
                cost: deleteModalState.cost,
                carBrand: deleteModalState.car.split(' ')[0] || '',
                carModel: deleteModalState.car.split(' ').slice(1).join(' ') || '',
                registrationNumber: '',
              } as ServiceEntryType
            }
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
