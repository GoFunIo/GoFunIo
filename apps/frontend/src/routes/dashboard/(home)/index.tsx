import { useUser } from '@/hooks/useUser';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { actionsArray, activityArray } from '@/store/cars';
import { createFileRoute, Link, ToOptions, useNavigate } from '@tanstack/react-router';
import { CarFront, LucideIcon, ShieldAlert, TriangleAlert, Users, Wrench } from 'lucide-react';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { AdminAlertBucket } from '@/features/dashboard/widgets/AdminAlertBucket';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import { useMemo, useState } from 'react';
import { Modal } from '@/features/dashboard/ui/Modal';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { Banner } from '@/features/dashboard/widgets/Banner';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { ActionButton } from '@/features/dashboard/ui/ActionButton';
import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVehiclesServicesForm';
import { History, HistoryDataItem, serviceTypeLabels } from '@/features/dashboard/widgets/History';
import { AddEditUserForm } from '@/features/dashboard/forms/AddEditUserForm';
import {
  DeleteServiceConfirm,
  ServiceEntryType,
} from '@/features/dashboard/forms/DeleteServiceConfirm';
import { useVehicles } from '@/hooks/useVehicles';
import { VehicleData } from '@/features/dashboard/types';

type QuickAction = {
  id: number;
  title: string;
  icon: LucideIcon;
  actionType: 'modal_car' | 'modal_user' | 'modal_service' | 'link';
  href?: ToOptions['to'];
};

const typedActions = actionsArray as unknown as QuickAction[];

export const Route = createFileRoute('/dashboard/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const navigate = useNavigate();

  const {
    data: vehiclesResponse,
    isLoading: isVehiclesLoading,
    refetch: refetchVehicles,
  } = useVehicles();
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
      vehicles.reduce(
        (acc, car) => {
          if (!car.technicalInspectionExpiry) return acc;
          const { days } = calculateDaysToDate(car.technicalInspectionExpiry);

          if (days <= 7) {
            acc.days7++;
          } else if (days > 7 && days <= 30) {
            acc.days30++;
          } else if (days > 30 && days <= 60) {
            acc.days60++;
          }
          return acc;
        },
        { days7: 0, days30: 0, days60: 0 },
      ),
    [vehicles],
  );

  // LOGIKA OC / AC — ocExpiry
  const insuranceStats = useMemo(
    () =>
      vehicles.reduce(
        (acc, car) => {
          if (car.ocExpiry) {
            const ocDiff = calculateDaysToDate(car.ocExpiry).days;
            if (ocDiff <= 7) acc.days7++;
            else if (ocDiff <= 30) acc.days30++;
            else if (ocDiff <= 60) acc.days60++;
          }

          if (car.acExpiry) {
            const acDiff = calculateDaysToDate(car.acExpiry).days;
            if (acDiff <= 7) acc.days7++;
            else if (acDiff <= 30) acc.days30++;
            else if (acDiff <= 60) acc.days60++;
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
    activeUsersCount: 2, // brak endpointu użytkowników — pozostaje mock
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

  if (isUserLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full ">
        <div className="lg:col-span-6">
          <DashboardHeader
            title={`Hello, ${user.email}`}
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
            value={isVehiclesLoading ? '...' : adminStats.totalFleetVehicles}
            subtitle="aktywne"
            icon={<CarFront size={20} />}
          />
        </Link>
        <Link to="/dashboard/settings/users" className="block no-underline">
          <DashboardCard
            title="Aktywni użytkownicy"
            value={adminStats.activeUsersCount}
            subtitle="osoby mają pojazdy w systemie"
            icon={<Users size={20} />}
          />
        </Link>

        <Link to="/dashboard/notifications" className="block no-underline">
          <DashboardCard
            title="Pilne przypomnienia"
            value={isVehiclesLoading ? '...' : adminStats.urgentReminders}
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

        {isVehiclesLoading ? (
          <p className="text-content-secondary text-[14px]">Ładowanie pojazdów…</p>
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
