import { useMemo, useState } from 'react';
import { createFileRoute, Link, ToOptions, useNavigate } from '@tanstack/react-router';
import {
  CarFront,
  LucideIcon,
  Plus,
  ShieldAlert,
  TriangleAlert,
  Users,
  Wrench,
  Activity,
} from 'lucide-react';

import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { useUser } from '@/features/dashboard/hooks/user.hooks';
import { useTeam } from '@/features/dashboard/hooks/team.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { useService, useServices } from '@/features/dashboard/hooks/services.hooks';
import {
  useAlertPolicy,
  useNotificationCenterSummary,
} from '@/features/dashboard/hooks/notificationCenter.hooks';
import { useAllVehicleAlerts } from '@/features/dashboard/hooks/useVehicleAlerts';

import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { ActionButton } from '@/features/dashboard/ui/ActionButton';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { ReminderRow } from '@/features/dashboard/widgets/ReminderRow';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { AdminAlertBucket } from '@/features/dashboard/widgets/AdminAlertBucket';
import { Banner } from '@/features/dashboard/widgets/Banner';
import { History } from '@/features/dashboard/widgets/History';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { AddEditUserForm } from '@/features/dashboard/forms/AddEditUserForm';
import { DeleteServiceConfirm } from '@/features/dashboard/forms/DeleteServiceConfirm';
import { VehicleData } from '@/features/dashboard/types';
import { ServiceData } from '@/features/dashboard/types';
import { getUserFullName } from '@/utils/getUserFullName';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { VehiclesServiceForm } from '@/features/dashboard/forms/VehiclesServicesForm';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

type DashboardAction = {
  id: number;
  title: string;
  icon: LucideIcon;
  actionType: 'modal_car' | 'modal_user' | 'modal_service' | 'link';
  href?: string;
};

type ModalType =
  | 'add_car'
  | 'edit_car'
  | 'add_service'
  | 'edit_service'
  | 'delete_service'
  | 'add_user'
  | null;

export const dashboardActions: DashboardAction[] = [
  {
    id: 1,
    title: 'Dodaj pojazd',
    icon: Plus,
    actionType: 'modal_car',
  },
  {
    id: 2,
    title: 'Dodaj wpis serwisowy',
    icon: Wrench,
    actionType: 'modal_service',
  },
  {
    id: 3,
    title: 'Dodaj użytkownika',
    icon: Users,
    actionType: 'modal_user',
  },
  {
    id: 4,
    title: 'Oś czasu serwisu',
    icon: Activity,
    actionType: 'link',
    href: '/dashboard/timeline',
  },
];

type DayBucketKey = 'days7' | 'days30' | 'days60';
type DayBuckets = Record<DayBucketKey, number>;

const bucketKey = (daysRemaining: number): DayBucketKey | null => {
  if (daysRemaining <= 7) return 'days7';
  if (daysRemaining <= 30) return 'days30';
  if (daysRemaining <= 60) return 'days60';
  return null;
};

export const Route = createFileRoute('/dashboard/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const { data: selectedService } = useService(selectedServiceId);

  const { data: user } = useUser();
  const { data: vehiclesResponse, isPending: isVehiclesPending } = useVehicles();
  const { data: servicesResponse } = useServices();

  const { data: team, isPending: isTeamPending } = useTeam();
  const { canInviteUsers, canManageUsers } = usePermissions();

  const { data: summary } = useNotificationCenterSummary();
  const { data: alertPolicy } = useAlertPolicy();
  const { items: vehicleAlerts, isPending: isAlertsPending } = useAllVehicleAlerts({ limit: 100 });

  const hasExtendedThreshold = (alertPolicy?.leadDays ?? []).some((day) => day > 30);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const HISTORY_PAGE_SIZE = 5;
  const { data: historyServicesResponse } = useServices({
    page: historyPage,
    pageSize: HISTORY_PAGE_SIZE,
  });

  const isTeamLoading = isTeamPending && canManageUsers;
  const activeUsersCount = canManageUsers ? (team?.length ?? 0) : 1;

  const vehicles: VehicleData[] = vehiclesResponse?.items ?? [];
  const services: ServiceData[] = servicesResponse?.items ?? [];

  const selectedCar = vehicles.find((c) => c.id === selectedCarId);

  const handleRenewCar = (id: string) => {
    setSelectedCarId(id);
    setActiveModal('edit_car');
  };

  const handleEditServiceClick = (item: ServiceData) => {
    setSelectedServiceId(item.id);
    setActiveModal('edit_service');
  };

  const handleDeleteServiceClick = (item: ServiceData) => {
    setSelectedServiceId(item.id);
    setActiveModal('delete_service');
  };

  // ============================================================
  // PRZEGLĄDY TECHNICZNE
  // ============================================================
  const inspectionStats = useMemo(
    () =>
      vehicleAlerts
        .filter((alert) => alert.deadlineKind === 'TECHNICAL_INSPECTION')
        .reduce<DayBuckets>(
          (acc, alert) => {
            const key = bucketKey(alert.daysRemaining);
            if (key) acc[key]++;
            return acc;
          },
          { days7: 0, days30: 0, days60: 0 },
        ),
    [vehicleAlerts],
  );

  // ============================================================
  // OC / AC
  // ============================================================
  const insuranceStats = useMemo(
    () =>
      vehicleAlerts
        .filter((alert) => alert.deadlineKind === 'OC' || alert.deadlineKind === 'AC')
        .reduce<DayBuckets>(
          (acc, alert) => {
            const key = bucketKey(alert.daysRemaining);
            if (key) acc[key]++;
            return acc;
          },
          { days7: 0, days30: 0, days60: 0 },
        ),
    [vehicleAlerts],
  );

  const adminStats = {
    totalFleetVehicles: vehiclesResponse?.total ?? vehicles.length,
    activeUsersCount,
    urgentReminders: summary?.activeAlertCount ?? 0,
  };

  const remindersAlerts = useMemo(
    () => vehicleAlerts.filter((alert) => alert.overdue || alert.daysRemaining <= 30),
    [vehicleAlerts],
  );

  // ============================================================
  // PODSUMOWANIE WYDATKÓW
  // ============================================================
  const expensesSummary = useMemo(() => {
    let servicesAndRepairs = 0;
    let insurance = 0;

    services.forEach((service) => {
      const cost = Number(service.cost) || 0;

      if (service.type === 'OC' || service.type === 'AC') {
        insurance += cost;
      } else {
        servicesAndRepairs += cost;
      }
    });

    return {
      servicesAndRepairs,
      insurance,
      total: servicesAndRepairs + insurance,
    };
  }, [services]);

  // ============================================================
  // QUICK ACTIONS
  // ============================================================
  const visibleActions = useMemo(
    () =>
      dashboardActions.filter((action) => {
        if (action.actionType === 'modal_user') return canInviteUsers;
        return true;
      }),
    [canInviteUsers],
  );

  const handleActionClick = (actionType: DashboardAction['actionType'], href?: ToOptions['to']) => {
    if (actionType === 'link' && href) {
      navigate({ to: href });
      return;
    }
    if (actionType === 'modal_car') {
      setActiveModal('add_car');
      return;
    }
    if (actionType === 'modal_user') {
      if (!canInviteUsers) return;
      setActiveModal('add_user');
      return;
    }
    if (actionType === 'modal_service') {
      setActiveModal('add_service');
      return;
    }
  };

  // ============================================================
  // CONFIG DLA MODALI
  // ============================================================
  const getModalConfig = () => {
    switch (activeModal) {
      case 'add_car':
        return {
          title: 'Dodaj pojazd',
          subtitle: 'Wprowadź dane pojazdu. Pola oznaczone * są wymagane.',
          content: <AddVehicleForm onClose={() => setActiveModal(null)} />,
        };

      case 'edit_car':
        if (!selectedCar) return { title: '', subtitle: '', content: null };

        return {
          title: `Edytuj pojazd ${selectedCar.brand} ${selectedCar.model}`,
          subtitle: 'Zaktualizuj ubezpieczenia lub badania techniczne pojazdu.',
          content: (
            <AddVehicleForm
              initialData={selectedCar}
              onClose={() => {
                setActiveModal(null);
                setSelectedCarId(null);
              }}
              isRenewalMode={true}
            />
          ),
        };

      case 'add_service':
        return {
          title: 'Dodaj wpis serwisowy',
          subtitle: 'Wprowadź szczegóły wykonanej naprawy lub serwisu.',
          content: (
            <div className="text-center text-content-secondary">
              <VehiclesServiceForm mode="create" onClose={() => setActiveModal(null)} />
            </div>
          ),
        };

      case 'edit_service':
        if (!selectedService) return { title: '', subtitle: '', content: null };

        return {
          title: 'Edytuj wpis serwisowy',
          subtitle: 'Zaktualizuj szczegóły, koszt lub miejsce wykonania usługi.',
          content: (
            <VehiclesServiceForm
              mode="edit"
              service={selectedService}
              onClose={() => {
                setActiveModal(null);
                setSelectedServiceId(null);
              }}
            />
          ),
        };

      case 'delete_service':
        if (!selectedService) return { title: '', subtitle: '', content: null };

        return {
          title: 'Usuń wpis serwisowy',
          subtitle:
            'Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna.',
          content: (
            <DeleteServiceConfirm
              service={selectedService}
              onClose={() => {
                setActiveModal(null);
                setSelectedServiceId(null);
              }}
            />
          ),
        };

      case 'add_user':
        return {
          title: 'Dodaj użytkownika',
          subtitle: 'Wprowadź dane nowego kierowcy lub administratora systemu.',
          content: <AddEditUserForm onClose={() => setActiveModal(null)} />,
        };

      default:
        return { title: '', subtitle: '', content: null };
    }
  };

  const modalConfig = getModalConfig();

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

      {/* ========================================================
          KARTY STATYSTYK
          ======================================================== */}
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

        <Link to="/dashboard/alerts" className="block no-underline">
          <DashboardCard
            title="Pilne przypomnienia"
            value={isAlertsPending ? '...' : adminStats.urgentReminders}
            subtitle="aktualnych alertów"
            icon={<TriangleAlert size={20} />}
            variant="alert"
          />
        </Link>
      </GridWrapper>

      {/* ========================================================
          NADCHODZĄCE TERMINY
          ======================================================== */}
      <BlockWrapper>
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[18px] text-content-primary font-semibold mb-2">
              Nadchodzące terminy
            </p>
            <p className="text-[14px] text-content-secondary">
              Liczba pojazdów wymagających uwagi w najbliższym czasie
            </p>
          </div>

          <BoardButton
            variant="default"
            size="medium"
            type="button"
            onClick={() => navigate({ to: '/dashboard/alerts' })}
            className="shrink-0"
          >
            Zobacz wszystkie alerty →
          </BoardButton>
        </div>

        {isAlertsPending ? (
          <LoadingIcon className="m-auto" />
        ) : (
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-6">
            <div className="flex flex-col gap-4">
              <AdminAlertBucket
                title="Przeglądy techniczne"
                icon={Wrench}
                stats={{
                  days7: inspectionStats.days7,
                  days30: inspectionStats.days30,
                  ...(hasExtendedThreshold ? { days60: inspectionStats.days60 } : {}),
                }}
              />
              <ReminderRow
                alerts={remindersAlerts}
                filterType="inspection"
                onRenewCar={handleRenewCar}
                limit={5}
              />
            </div>

            <div className="flex flex-col gap-4">
              <AdminAlertBucket
                title="Ubezpieczenia (OC / AC)"
                icon={ShieldAlert}
                stats={{
                  days7: insuranceStats.days7,
                  days30: insuranceStats.days30,
                  ...(hasExtendedThreshold ? { days60: insuranceStats.days60 } : {}),
                }}
              />
              <ReminderRow
                alerts={remindersAlerts}
                filterType="insurance"
                onRenewCar={handleRenewCar}
                limit={5}
              />
            </div>
          </div>
        )}
      </BlockWrapper>

      {/* ========================================================
          HISTORIA + QUICK ACTIONS
          ======================================================== */}

      <GridWrapper layout="2-unequal">
        <History
          title="Ostatnia aktywność"
          data={historyServicesResponse?.items ?? []}
          link={{
            label: 'Zobacz pełną historię',
            href: '/dashboard/service',
          }}
          onEditClick={handleEditServiceClick}
          onDeleteClick={handleDeleteServiceClick}
          pagination={{
            currentPage: historyServicesResponse?.page ?? historyPage,
            totalPages: historyServicesResponse?.totalPages ?? 1,
            onPageChange: setHistoryPage,
          }}
        />

        {/* SZYBKIE AKCJE PRAWA STRONA */}
        <div className=" flex flex-col gap-6">
          <BlockWrapper className="lg:col-span-1 h-fit">
            <h4 className="text-content-primary ">Szybkie akcje</h4>

            <div className="flex flex-col gap-[12px] pt-6 ">
              {visibleActions.map((item) => (
                <ActionButton
                  key={item.id}
                  title={item.title}
                  icon={item.icon}
                  onClick={() =>
                    handleActionClick(item.actionType, item.href as ToOptions['to'] | undefined)
                  }
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

      {/* ========================================================
          MODAL
          ======================================================== */}
      <Modal
        isOpen={activeModal !== null}
        setIsOpen={(isOpen) => {
          if (!isOpen) {
            setActiveModal(null);
            setSelectedCarId(null);
            setSelectedServiceId(null);
          }
        }}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
      >
        {modalConfig.content}
      </Modal>
    </>
  );
}
