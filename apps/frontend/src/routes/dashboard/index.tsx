import { useUser } from '@/hooks/useUser';
import { Banner } from '@/modules/dashboard/shared/Banner';
import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { EmptyPlaceholder } from '@/modules/dashboard/shared/EmptyPlaceholder';
import { Card } from '@/modules/dashboard/ui/Card';
import { IconWrapper } from '@/modules/dashboard/ui/IconWrapper';
import { formatDays } from '@/utils/formatDays';
import { createFileRoute, Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { Activity, AlertTriangle, CarFront, Plus, Wrench } from 'lucide-react';

export const Route = createFileRoute('/dashboard/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  // static data for example
  const activity = {
    id: 1,
    title: 'Pełny serwis',
    car: 'BMW E60',
    date: '3 kwi 2026',
    price: '1850.00',
    place: 'BMW Serwis Kraków',
  };

  const info = {
    id: 1,
    title: 'Moje pojazdy',
    count: 3,
    subtitle: 'aktywnych',
    status: '',
    icon: CarFront,
  };

  const cars = {
    id: 1,
    title: 'BMW',
    termin: 31,
  };

  const actions = {
    id: 1,
    title: 'Dodaj pojazd',
    onClick: () => {},
    icon: Plus,
  };

  const activityArr = Array.from({ length: 6 }, (_, i) => ({ ...activity, id: i + 1 }));
  const carsArr = Array.from({ length: 2 }, (_, i) => ({ ...cars, id: i + 1 }));
  const infoArr = Array.from({ length: 3 }, (_, i) => ({ ...info, id: i + 1 }));
  const actionsArr = Array.from({ length: 3 }, (_, i) => ({ ...actions, id: i + 1 }));

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
            sm:grid-cols-2"
        >
          {infoArr.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.id}
                className={classNames('w-full flex justify-between', {
                  'border-info bg-info-bg': item.status === 'info',
                  'border-warning bg-warning-bg': item.status === 'warning',
                  '!border-alert !bg-alert-bg': item.status === 'alert',
                })}
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
          <Card className="lg:col-span-2 h-fit">
            <div className="flex gap-[10px] items-center">
              <Activity className="text-secondary" size={20} />
              <h4 className="">Ostatnia aktywność</h4>
              <Link to="/dashboard/timeline" className="text-secondary text-[12px] ml-[auto]">
                Zobacz wszystko
              </Link>
            </div>
            {!activityArr || activityArr.length === 0 ? (
              <EmptyPlaceholder
                title="Wprowadż pierwszy wpis serwisowy."
                className="min-h-[240px] mt-[16px]"
              />
            ) : (
              <div className="mt-[16px] flex flex-col gap-[16px]">
                {activityArr.map((item) => {
                  return (
                    <div
                      className="not-last:pb-[10px] flex gap-[16px] not-last:border-b not-last:border-icon items-start"
                      key={item.id}
                    >
                      <IconWrapper className="bg-info/25 !h-[30px] !w-[30px] mt-[4px]">
                        <Wrench className="text-info" size={18} />
                      </IconWrapper>
                      <div className="">
                        <p className="text-dark text-[14px]">{item.title}</p>
                        <p className="text-[12px]">
                          {item.car} - {item.date}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <p className="text-right text-dark font-bold text-[14px]">
                          {item.price} zł
                        </p>
                        <p className="text-right text-[12px]">{item.place}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

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
              {!carsArr || carsArr.length === 0 ? (
                <EmptyPlaceholder className="mt-[18px]" title="Brak aktualnych przegladów" />
              ) : (
                <div className="flex flex-col gap-[8px] mt-[18px]">
                  {carsArr.map((item) => {
                    return (
                      <div className="flex items-center justify-between gap-[12px]" key={item.id}>
                        <p className="text-[14px] text-dark">{item.title}</p>
                        <p
                          className={classNames(
                            'flex items-center justify-center shrink-0 h-[21px] min-w-[52px] px-[8px] rounded-[3px] font-semibold text-[10px]/[100%]',
                            {
                              'bg-alert text-white': item.termin >= 0 && item.termin < 7,
                              'bg-warning text-dark': item.termin >= 7 && item.termin < 28,
                              'bg-bg-section text-dark': item.termin >= 28,
                            },
                          )}
                        >
                          {item.termin} {formatDays(item.termin)}
                        </p>
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
