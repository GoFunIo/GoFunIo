import { useUser } from '@/hooks/useUser';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, CarFront } from 'lucide-react';
import { actionsArr, activityArr, carSingleArr } from '@/store/cars';
import { DashboardHeader } from '@/features/dashboard/layout/DashboardHeader';
import { Banner } from '@/features/dashboard/widgets/Banner';
import { GridWrapper } from '@/features/dashboard/layout/GridWrapper';
import { BlockWrapper } from '@/features/dashboard/layout/BlockWrapper';
import { IconWrapper } from '@/features/dashboard/layout/IconWrapper';
import { History } from '@/features/dashboard/widgets/History';
import { EmptyPlaceholder } from '@/features/dashboard/layout/EmptyPlaceholder';
import { DaysAmount } from '@/features/dashboard/ui/DaysAmount';

export const Route = createFileRoute('/dashboard/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  return (
    <>
      {/* header */}
      <DashboardHeader
        title={`Hello, ${user.email}`}
        subtitle="Oto, co dzieje się z Twoją flotą dzisiaj."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => {},
        }}
      />

      {/* banner */}
      <Banner title="Plan indywidualny" subtitle="Plan aktywny do 20.12.2026" variant="info" />
      <Banner variant="warning" title="Plan indywidualby" subtitle="Plan aktywny do 20.12.2026" />
      <Banner
        variant="alert"
        title="Plan indywidualby"
        subtitle="Aplikacja działa w trybie tylko do odczytu — nie możesz dodawać ani edytować pojazdów i wpisów serwisowych."
      />

      {/* main 3 blocks with most important info  */}
      <GridWrapper layout="3-equal">
        <BlockWrapper className="flex justify-between" variant="default">
          <div className="">
            <p className="text-[14px] text-black pb-[5px]">Moje pojazdy</p>
            <div className="flex gap-[12px] items-center">
              <h3 className="">3</h3>
              {false && <AlertTriangle className="text-alert" />}
            </div>
            <p className="text-[14px] text-black pt-[5px]">aktywnych</p>
          </div>
          <IconWrapper>
            <CarFront />
          </IconWrapper>
        </BlockWrapper>

        <BlockWrapper className="flex justify-between" variant="alert">
          <div className="">
            <p className="text-[14px] text-black pb-[5px]">Moje pojazdy</p>
            <div className="flex gap-[12px] items-center">
              <h3 className="">3</h3>
              {true && <AlertTriangle className="text-alert" />}
            </div>
            <p className="text-[14px] text-black pt-[5px]">aktywnych</p>
          </div>
          <IconWrapper variant="alert">
            <CarFront />
          </IconWrapper>
        </BlockWrapper>

        <BlockWrapper className="flex justify-between" variant="warning">
          <div className="">
            <p className="text-[14px] text-black pb-[5px]">Moje pojazdy</p>
            <div className="flex gap-[12px] items-center">
              <h3 className="">3</h3>
              {false && <AlertTriangle className="text-alert" />}
            </div>
            <p className="text-[14px] text-black pt-[5px]">aktywnych</p>
          </div>
          <IconWrapper variant="warning">
            <CarFront />
          </IconWrapper>
        </BlockWrapper>
      </GridWrapper>

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

        {/* block with quick actions */}
        <BlockWrapper className="lg:col-span-1 h-fit">
          <h4 className="text-black">Szybkie akcje</h4>
          <div className="flex flex-col gap-[12px] py-[16px] border-b border-icon">
            {actionsArr.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="custom-transition hover:shadow-[0_3px_13px_0_rgba(0,0,0,0.2)] w-full text-[14px] text-dark bg-bg-section min-h-[32px] flex items-center gap-[8px] px-[12px] cursor-pointer rounded-[7px]"
                >
                  <Icon className="text-dark" size={16} />
                  {item.title}
                </button>
              );
            })}
          </div>
          <div className="pt-[12px]">
            <p className="text-dark font-semibold text-[14px]">Nadchodzące przeglądy</p>
            {!carSingleArr || carSingleArr.length === 0 ? (
              <EmptyPlaceholder className="mt-[18px]" title="Brak aktualnych przegladów" />
            ) : (
              <div className="flex flex-col gap-[8px] mt-[18px]">
                {carSingleArr.map((item) => {
                  return (
                    <div className="flex items-center justify-between gap-[12px]" key={item.id}>
                      <p className="text-[14px] text-dark">{item.title}</p>
                      <DaysAmount days={item.termin} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </BlockWrapper>
      </GridWrapper>
    </>
  );
}
