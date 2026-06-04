import { useUser } from '@/hooks/useUser';
import { createFileRoute } from '@tanstack/react-router';
import { CarFront, Calendar, Wrench } from 'lucide-react';
import { actionsArr, activityArr, carSingleArr } from '@/store/cars';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { History } from '@/features/dashboard/widgets/History';
import { DaysAmount } from '@/features/dashboard/ui/DaysAmount';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Modal } from '@/features/dashboard/ui/Modal';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';
import { useState } from 'react';
import { DashboardCard } from '@/features/dashboard/widgets/DashboardCard';
import { AddVehicleInputs } from '@/features/dashboard/types/FormTypes';
import { Banner } from '@/features/dashboard/widgets/Banner';

// test  - z api bedzie sie pobierac
const alertVehicle: AddVehicleInputs = {
  brand: 'Ford',
  model: 'Transit',
  technicalInspectionExpiry: '2026-06-06',
};

export const Route = createFileRoute('/dashboard/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading } = useUser();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  //test subskrypcji
  const subscriptionStatus = 'warning' as 'info' | 'warning' | 'alert';

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

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
        <DashboardCard
          title="Moje pojazdy"
          value={3}
          subtitle="aktywnych"
          icon={<CarFront size={20} />}
        />

        <DashboardCard
          title="przegląd"
          value="2026-06-01"
          subtitle={`${alertVehicle.brand} ${alertVehicle.model}`}
          icon={<Calendar size={20} />}
        />

        <DashboardCard
          title="Wpisów serwisowych"
          value={4}
          subtitle="łącznie"
          icon={<Wrench size={20} />}
        />
      </div>

      {/* block with quick actions */}
      <GridWrapper layout="2-unequal">
        {/* block with last activity */}
        <History
          data={activityArr}
          link={{
            label: 'Zobacz wszystko',
            href: '/dashboard/timeline',
          }}
          title="Ostatnia aktywność"
        />

        <BlockWrapper className="lg:col-span-1 h-fit">
          <h4 className="text-content-primary">Szybkie akcje</h4>
          <div className="flex flex-col gap-[12px] py-[16px] border-b border-icon">
            {actionsArr.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="custom-transition hover:shadow-[0_3px_13px_0_rgba(0,0,0,0.2)] w-full text-[14px] text-content-secondary bg-bg-section min-h-[32px] flex items-center gap-[8px] px-[12px] cursor-pointer rounded-[7px]"
                >
                  <Icon className="text-content-primary" size={16} />
                  {item.title}
                </button>
              );
            })}
          </div>
          <div className="pt-[12px]">
            <p className="text-content-primary font-semibold text-[14px]">Nadchodzące przeglądy</p>
            {!carSingleArr || carSingleArr.length === 0 ? (
              <EmptyPlaceholder className="mt-[18px]" title="Brak aktualnych przegladów" />
            ) : (
              <div className="flex flex-col gap-[8px] mt-[18px]">
                {carSingleArr.map((item) => {
                  return (
                    <div className="flex items-center justify-between gap-[12px]" key={item.id}>
                      <p className="text-[14px] text-content-secondary">{item.title}</p>
                      <DaysAmount days={item.termin} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </BlockWrapper>
      </GridWrapper>

      <Modal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        title="Dodaj pojazd"
        subtitle="Wprowadź dane pojazdu. Pola oznaczone * są wymagane."
      >
        <AddVehicleForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </>
  );
}
