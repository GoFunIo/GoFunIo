import { useUser } from '@/hooks/useUser';
import { createFileRoute, Link, ToOptions, useNavigate } from '@tanstack/react-router';
import { CarFront, Calendar, Wrench, LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { actionsArray, activityArray, mockCars } from '@/store/cars';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { History, HistoryDataItem } from '@/features/dashboard/widgets/History';
import { DaysAmount } from '@/features/dashboard/ui/DaysAmount';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Modal } from '@/features/dashboard/ui/Modal';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';

import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { Banner } from '@/features/dashboard/widgets/Banner';
import { ActionButton } from '@/features/dashboard/ui/ActionButton';
import { AddVehicleServiceForm } from '@/features/dashboard/forms/AddVehiclesServicesForm';
import { calculateDaysToDate, DateDiffResult } from '@/utils/calculateDaysToDate';

type QuickAction = {
  id: number;
  title: string;
  icon: LucideIcon;
  actionType: 'modal' | 'modal_service' | 'link';
  href?: ToOptions['to'];
};

const typedActions = actionsArray as unknown as QuickAction[];

type TermAlert = {
  id: string;
  carId: number;
  carName: string;
  type: 'Przegląd' | 'Ubezpieczenie OC' | 'Ubezpieczenie AC';
  dateInfo: DateDiffResult; //
};

//test subskrypcji
const subscriptionStatus = 'warning' as 'info' | 'warning' | 'alert';

export const Route = createFileRoute('/dashboard/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading } = useUser();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  // FUNKCJA POMOCNICZA DO SZYBKIHC AKCJI
  const handleActionClick = (
    actionType: 'modal' | 'modal_service' | 'link',
    href?: ToOptions['to'],
  ) => {
    if (actionType === 'link' && href) {
      navigate({ to: href });
      return;
    }

    if (actionType === 'modal') {
      setIsModalOpen(true);
      return;
    }

    if (actionType === 'modal_service') {
      setIsServiceModalOpen(true);
      return;
    }
  };

  // nadchodzace terminy - sortuje wg najpilniejszych
  const allAlerts: TermAlert[] = mockCars.flatMap((car) => {
    return [
      {
        id: `${car.id}-inspection`,
        carId: car.id,
        carName: `${car.brand} ${car.model}`,
        type: 'Przegląd' as const,
        dateInfo: calculateDaysToDate(car.technicalInspectionExpiry),
      },
      {
        id: `${car.id}-oc`,
        carId: car.id,
        carName: `${car.brand} ${car.model}`,
        type: 'Ubezpieczenie OC' as const,
        dateInfo: calculateDaysToDate(car.ocExpiry),
      },
      {
        id: `${car.id}-ac`,
        carId: car.id,
        carName: `${car.brand} ${car.model}`,
        type: 'Ubezpieczenie AC' as const,
        dateInfo: calculateDaysToDate(car.acExpiry),
      },
    ];
  });

  const sortedAlerts = allAlerts
    .filter((alert) => alert.dateInfo.days <= 30)
    .sort((a, b) => a.dateInfo.days - b.dateInfo.days);

  const urgentAlert = sortedAlerts[0];

  return (
    <>
      <DashboardHeader
        title={`Hello, ${user.email}`}
        subtitle="Oto, co dzieje się z Twoją flotą dzisiaj."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => setIsModalOpen(true),
        }}
      />

      {/* SEKCJA BANERÓW SUBSKRYPCJI */}
      {subscriptionStatus === 'info' && (
        <Banner variant="info" title="Plan indywidualny" subtitle="Plan aktywny do 20.12.2026" />
      )}

      {subscriptionStatus === 'warning' && (
        <Banner
          variant="warning"
          title="Okres próbny: pozostało 7 dni"
          subtitle="Aktywuj plan, aby nie stracić dostępu do zarządzania flotą."
        />
      )}

      {subscriptionStatus === 'alert' && (
        <Banner
          variant="alert"
          title="Okres próbny zakończył się"
          subtitle="Aplikacja działa w trybie tylko do odczytu — nie możesz dodawać ani edytować pojazdów i wpisów serwisowych."
        />
      )}

      {/* SIATKA STATYSTYK I ALERTÓW TERMINÓW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/dashboard/my-cars" className="block no-underline">
          <DashboardCard
            title="Moje pojazdy"
            value={3}
            subtitle="aktywnych"
            icon={<CarFront size={20} />}
          />
        </Link>

        <Link
          to="/dashboard/my-cars/$carId"
          params={{ carId: String(urgentAlert?.carId) }}
          className="block no-underline"
        >
          <DashboardCard
            title={urgentAlert?.type ?? 'Najbliższy termin'}
            value={(() => {
              const car = mockCars.find((c) => c.id === urgentAlert?.carId);
              if (!car || !urgentAlert) return 'Brak';
              if (urgentAlert.type === 'Przegląd') return car.technicalInspectionExpiry;
              if (urgentAlert.type === 'Ubezpieczenie OC') return car.ocExpiry;
              return car.acExpiry;
            })()}
            subtitle={urgentAlert?.carName ?? 'Brak danych'}
            icon={<Calendar size={20} />}
          />
        </Link>

        <Link to="/dashboard/service">
          <DashboardCard
            title="Wpisów serwisowych"
            value={4}
            subtitle="łącznie"
            icon={<Wrench size={20} />}
          />
        </Link>
      </div>

      <GridWrapper layout="2-unequal">
        {/* HISTORIA SERWISOWA LEWA STRONA */}
        <History
          data={activityArray as HistoryDataItem[]}
          link={{
            label: 'Zobacz pełną historię',
            href: '/dashboard/service',
          }}
          title="Ostatnia aktywność"
        />

        {/* SZYBKIE AKCJE PRAWA STRONA */}
        <BlockWrapper className="lg:col-span-1 h-fit">
          <h4 className="text-content-primary ">Szybkie akcje</h4>

          <div className="flex flex-col gap-[12px] py-6 border-b border-icon">
            {typedActions.map((item) => (
              <ActionButton
                key={item.id}
                title={item.title}
                icon={item.icon}
                onClick={() => handleActionClick(item.actionType, item.href)}
              />
            ))}
          </div>

          <div className="pt-6">
            <p className="text-content-primary font-semibold text-[14px] mb-4">
              Nadchodzące terminy
            </p>
            {!mockCars || mockCars.length === 0 ? (
              <EmptyPlaceholder className="" title="Brak aktualnych przeglądów" />
            ) : (
              <div className="flex flex-col gap-[10px] ">
                {sortedAlerts.map((alert) => {
                  return (
                    <Link
                      key={alert.id}
                      to="/dashboard/my-cars/$carId"
                      params={{ carId: String(alert.carId) }}
                      className="block no-underline hover:bg-background-secondary p-1 rounded-md transition-colors"
                    >
                      <div className="flex items-center justify-between gap-[12px]">
                        <div>
                          <p className="text-[14px] text-content-primary font-medium leading-tight">
                            {alert.carName}
                          </p>
                          <span className="text-[12px] text-content-secondary font-normal">
                            {alert.type}
                          </span>
                        </div>

                        <DaysAmount days={alert.dateInfo.days} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </BlockWrapper>
      </GridWrapper>

      {/* MODAL 1: DODAJ POJAZD */}
      <Modal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        title="Dodaj pojazd"
        subtitle="Wprowadź dane pojazdu. Pola oznaczone * są wymagane."
      >
        <AddVehicleForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      {/* MODAL 2: DODAJ WPIS SERWISOWY */}
      <Modal
        isOpen={isServiceModalOpen}
        setIsOpen={setIsServiceModalOpen}
        title="Dodaj wpis serwisowy"
        subtitle="Wprowadź szczegóły wykonanej naprawy lub serwisu."
      >
        <div className="p-4 text-center text-content-secondary">
          <AddVehicleServiceForm onClose={() => setIsServiceModalOpen(false)} />
        </div>
      </Modal>
    </>
  );
}
