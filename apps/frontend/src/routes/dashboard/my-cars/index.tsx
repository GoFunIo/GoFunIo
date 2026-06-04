import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { DaysAmount } from '@/features/dashboard/ui/DaysAmount';
import { carsArr } from '@/store/cars';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, CarFront, Gauge } from 'lucide-react';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { useState } from 'react';
import { AddVehicleForm } from '@/features/dashboard/forms/AddVehicleForm';

export const Route = createFileRoute('/dashboard/my-cars/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <DashboardHeader
        title="Moje pojazdy"
        subtitle="Zarządzaj wszystkimi pojazdami w jednym miejscu."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => setIsModalOpen(true),
        }}
      />
      {!carsArr || carsArr.length === 0 ? (
        <EmptyPlaceholder
          className="bg-wbg-card min-h-[250px]"
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
              <BlockWrapper key={item.id}>
                <div className="flex gap-[16px]">
                  <IconWrapper className="w-[50px] h-[50px]">
                    <CarFront className="text-info" />
                  </IconWrapper>
                  <div className="">
                    <p className="font-bold text-[14px] text-dark">
                      {item.brand} {item.model}
                    </p>
                    <p className="text-[14px]">
                      {item.productionYear} - {item.fuelType}
                    </p>
                    <p className="text-[14px]">{item.registrationNumber}</p>
                  </div>
                </div>
                <div className="mt-[12px] mb-[16px]">
                  <div className="flex gap-[10px] items-center pb-[8px]">
                    <Gauge size={16} />
                    <p className="text-[14px]">{item.currentMileage} km</p>
                  </div>
                  <div className="flex gap-[10px] items-center">
                    <Calendar size={16} strokeWidth={3} className="text-content-primary " />
                    <p className="text-[14px] flex items-center gap-[16px]">
                      Przegląd za <DaysAmount days={item.vti} />
                    </p>
                  </div>
                </div>
                <BoardButton
                  className="w-full"
                  size="medium"
                  icon="arrow"
                  onClick={() =>
                    navigate({
                      to: `/dashboard/my-cars/${item.id}`,
                    })
                  }
                >
                  Zobacz szczegóły
                </BoardButton>
              </BlockWrapper>
            );
          })}
        </GridWrapper>
      )}

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
