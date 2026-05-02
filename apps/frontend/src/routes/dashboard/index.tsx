import { useUser } from '@/hooks/useUser';
import { Banner } from '@/modules/dashboard/shared/Banner';
import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { Card } from '@/modules/dashboard/ui/Card';
import { IconWrapper } from '@/modules/dashboard/ui/IconWrapper';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, CarFront } from 'lucide-react';

export const Route = createFileRoute('/dashboard/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  return (
    <>
      <DashboardHeader
        title={`Hello, ${user.email}`}
        subtitle="Oto, co dzieje się z Twoją flotą dzisiaj."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => {},
        }}
      />
      <div className="flex flex-col gap-[24px]">
        <Banner title="Plan indywidualby" subtitle="Plan aktywny do 20.12.2026" />
        <Banner type="warning" title="Plan indywidualby" subtitle="Plan aktywny do 20.12.2026" />
        <Banner
          type="alert"
          title="Plan indywidualby"
          subtitle="Aplikacja działa w trybie tylko do odczytu — nie możesz dodawać ani edytować pojazdów i wpisów serwisowych."
        />
        <div
          className="grid grid-cols-1 gap-[24px] 
            lg:grid-cols-3 
            sm:grid-cols-2"
        >
          <Card className="w-full flex justify-between bg-warning/15 border-warning">
            <div className="">
              <p className="text-[14px] text-black pb-[5px]">Moje pojazdy</p>
              <h3 className="">3</h3>
              <p className="text-[14px] text-black pt-[5px]">aktywnych</p>
            </div>
            <IconWrapper className="bg-warning/25">
              <CarFront className="text-warning" />
            </IconWrapper>
          </Card>
          <Card className="w-full flex justify-between bg-warning/15 !bg-alert/15 !border-alert">
            <div className="">
              <p className="text-[14px] text-black pb-[5px]">Moje pojazdy</p>
              <div className="flex gap-[12px] items-center">
                <h3 className="">3 dni</h3>
                <AlertTriangle className="text-alert" />
              </div>
              <p className="text-[14px] text-black pt-[5px]">aktywnych</p>
            </div>
            <IconWrapper className="bg-alert/25">
              <CarFront className="text-alert" />
            </IconWrapper>
          </Card>
          <Card className="w-full flex justify-between sm:col-span-2 lg:col-span-1">
            <div className="">
              <p className="text-[14px] text-black pb-[5px]">Moje pojazdy</p>
              <h3 className="">3</h3>
              <p className="text-[14px] text-black pt-[5px]">aktywnych</p>
            </div>
            <IconWrapper className="bg-info/25">
              <CarFront className="text-info" />
            </IconWrapper>
          </Card>
        </div>
      </div>
    </>
  );
}
