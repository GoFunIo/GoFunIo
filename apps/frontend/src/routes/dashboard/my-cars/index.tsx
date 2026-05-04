import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { EmptyPlaceholder } from '@/modules/dashboard/shared/EmptyPlaceholder';
import { GridWrapper } from '@/modules/dashboard/shared/GridWrapper';
import { BoardButton } from '@/modules/dashboard/ui/BoardButton';
import { Card } from '@/modules/dashboard/ui/Card';
import { DaysAmount } from '@/modules/dashboard/ui/DaysAmount';
import { IconWrapper } from '@/modules/dashboard/ui/IconWrapper';
import { carsArr } from '@/store/cars';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, CarFront, Gauge } from 'lucide-react';

export const Route = createFileRoute('/dashboard/my-cars/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <>
      <DashboardHeader
        title="Moje pojazdy"
        subtitle="Zarządzaj wszystkimi pojazdami w jednym miejscu."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => {},
        }}
      />
      {!carsArr || carsArr.length === 0 ? (
        <EmptyPlaceholder
          className="bg-white min-h-[250px]"
          title="Nie ma tu żadnych pojazdów. Dodaj pierwszy "
          button={{
            label: 'Zobacz wszystko',
            onClick: () => {},
          }}
          icon={<CarFront size={48} className="text-primary" />}
        />
      ) : (
        <GridWrapper layout="3-equal">
          {carsArr.map((item) => {
            return (
              <Card key={item.id}>
                <div className="flex gap-[16px]">
                  <IconWrapper className="w-[50px] h-[50px]">
                    <CarFront className="text-info" />
                  </IconWrapper>
                  <div className="">
                    <p className="font-bold text-[14px] text-dark">{item.title}</p>
                    <p className="text-[14px]">
                      {item.year} - {item.fuel}
                    </p>
                    <p className="text-[14px]">{item.registration}</p>
                  </div>
                </div>
                <div className="mt-[12px] mb-[16px]">
                  <div className="flex gap-[10px] items-center pb-[8px]">
                    <Gauge size={16} />
                    <p className="text-[14px]">{item.mileage} km</p>
                  </div>
                  <div className="flex gap-[10px] items-center">
                    <Calendar size={16} />
                    <p className="text-[14px] flex items-center gap-[16px]">
                      Przegląd za <DaysAmount days={item.vti} />
                    </p>
                  </div>
                </div>
                <BoardButton
                  className="w-full"
                  size="small"
                  onClick={() =>
                    navigate({
                      to: `/dashboard/my-cars/${item.id}`,
                    })
                  }
                >
                  Zobacz szczegóły
                </BoardButton>
              </Card>
            );
          })}
        </GridWrapper>
      )}
    </>
  );
}
