import { useUser } from '@/hooks/useUser';
import { Banner } from '@/modules/dashboard/shared/Banner';
import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { EmptyPlaceholder } from '@/modules/dashboard/shared/EmptyPlaceholder';
import { History } from '@/modules/dashboard/shared/History';
import { Card } from '@/modules/dashboard/ui/Card';
import { DaysAmount } from '@/modules/dashboard/ui/DaysAmount';
import { IconWrapper } from '@/modules/dashboard/ui/IconWrapper';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import classNames from 'classnames';
import { actionsArr, activityArr, carSingleArr, infoArr } from '@/store/cars';

export const Route = createFileRoute('/dashboard/')({
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

      <div className="flex flex-col md:gap-[24px] gap-[15px]">
        {/* banner */}
        <Banner title="Plan indywidualby" subtitle="Plan aktywny do 20.12.2026" type="info" />
        <Banner type="warning" title="Plan indywidualby" subtitle="Plan aktywny do 20.12.2026" />
        <Banner
          type="alert"
          title="Plan indywidualby"
          subtitle="Aplikacja działa w trybie tylko do odczytu — nie możesz dodawać ani edytować pojazdów i wpisów serwisowych."
        />

        {/* main 3 blocks with most important info  */}
        <div
          className="grid grid-cols-1 md:gap-[24px] gap-[15px] 
            lg:grid-cols-3 
            sm:grid-cols-2
            "
        >
          {infoArr.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.id}
                className={classNames(
                  'w-full flex justify-between sm:[&:nth-child(3)]:col-span-2 lg:[&:nth-child(3)]:col-span-1',
                  {
                    'border-info bg-info-bg': item.status === 'info',
                    'border-warning bg-warning-bg': item.status === 'warning',
                    '!border-alert !bg-alert-bg': item.status === 'alert',
                  },
                )}
              >
                <div className="">
                  <p className="text-[14px] text-black pb-[5px]">{item.title}</p>
                  <div className="flex gap-[12px] items-center">
                    <h3 className="">{item.count}</h3>
                    {item.status === 'alert' && <AlertTriangle className="text-alert" />}
                  </div>
                  <p className="text-[14px] text-black pt-[5px]">{item.subtitle}</p>
                </div>
                <IconWrapper
                  className={classNames('bg-info-bg-icon', {
                    '!bg-warning-bg-icon': item.status === 'warning',
                    '!bg-alert-bg-icon': item.status === 'alert',
                  })}
                >
                  <Icon
                    className={classNames('text-info', {
                      '!text-warning': item.status === 'warning',
                      '!text-alert': item.status === 'alert',
                    })}
                  />
                </IconWrapper>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 md:gap-[24px] gap-[15px]">
          {/* block with last activity */}
          <History
            className="lg:col-span-2"
            data={activityArr}
            link={{
              label: 'Zobacz wszystko',
              href: '/dashboard/timeline',
            }}
            title="Ostatnia aktywność"
          />

          {/* block with quick actions */}
          <Card className="lg:col-span-1 h-fit">
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
          </Card>
        </div>
      </div>
    </>
  );
}
