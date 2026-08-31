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

import { calculateDaysToDate } from '@/utils/calculateDaysToDate';

import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { ActionButton } from '@/features/dashboard/ui/ActionButton';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { AdminAlertBucket } from '@/features/dashboard/widgets/AdminAlertBucket';
import { Banner } from '@/features/dashboard/widgets/Banner';
import { History } from '@/features/dashboard/widgets/History';
import { VehicleData } from '@/features/dashboard/types';
import { ServiceData } from '@/features/dashboard/types';
import { getUserFullName } from '@/utils/getUserFullName';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useServices } from '@/features/dashboard/hooks/services.hooks';
import { useServiceModal } from '@/features/dashboard/hooks/useServiceModal';
import { useVehiclesModal } from '@/features/dashboard/hooks/useVehiclesModal';
import { useUsersModal } from '@/features/dashboard/hooks/useUsersModal';

type DashboardAction = {
  id: number;
  title: string;
  icon: LucideIcon;
  actionType: 'modal_car' | 'modal_user' | 'modal_service' | 'link';
  href?: string;
};

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

  const { openModal: openServiceModal, ServiceModal } = useServiceModal();
  const { openModal: openVehicleModal, VehiclesModal } = useVehiclesModal();
  const { openModal: openUsersModal, UsersModal } = useUsersModal();

  const { data: user } = useUser();
  const { data: vehiclesResponse, isPending: isVehiclesPending } = useVehicles();
  const { data: servicesResponse } = useServices();

  const { data: team, isPending: isTeamPending } = useTeam();
  const { canInviteUsers, canManageUsers } = usePermissions();

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

  // ============================================================
  // PRZEGLĄDY TECHNICZNE
  // ============================================================
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

  // ============================================================
  // OC / AC
  // ============================================================
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
    activeUsersCount,
    urgentReminders: totalUrgentReminders,
  };

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
      openVehicleModal('add_car');
      return;
    }
    if (actionType === 'modal_user') {
      if (!canInviteUsers) return;
      openUsersModal('add');
      return;
    }
    if (actionType === 'modal_service') {
      openServiceModal('add_service');
      return;
    }
  };

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

      {/* ========================================================
          NADCHODZĄCE TERMINY
          ======================================================== */}
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
              {/* <Reminders
                data={vehicles}
                filterType="inspection"
                onRenewCar={handleRenewCar}
                maxDays={30}
              /> */}
            </div>

            <div className="flex flex-col gap-4">
              <AdminAlertBucket
                title="Ubezpieczenia (OC / AC)"
                icon={ShieldAlert}
                stats={insuranceStats}
              />
              {/* <Reminders
                data={vehicles}
                filterType="insurance"
                onRenewCar={handleRenewCar}
                maxDays={30}
              /> */}
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
          onEditClick={(service) => openServiceModal('edit_service', service.id)}
          onDeleteClick={(service) => openServiceModal('delete_service', service.id)}
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
          MODALS
          ======================================================== */}
      {ServiceModal}
      {VehiclesModal}
      {UsersModal}
    </>
  );
}
