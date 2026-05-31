import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { reminderArr } from '@/store/cars';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, CarFront, Wrench } from 'lucide-react';

export const Route = createFileRoute('/dashboard/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Pulpit floty"
        subtitle="Alerty, finanse i aktywność w jednym miejscu."
      />

      <GridWrapper layout="3-equal">
        <BlockWrapper className="flex justify-between" variant="default">
          <div className="">
            <p className="text-[14px]  pb-[5px]">Moje pojazdy</p>
            <div className="flex gap-[12px] items-center">
              <h3 className="">3</h3>
              {false && <AlertTriangle className="text-alert" />}
            </div>
            <p className="text-[14px]  pt-[5px]">aktywnych</p>
          </div>
          <IconWrapper>
            <CarFront />
          </IconWrapper>
        </BlockWrapper>

        <BlockWrapper className="flex justify-between" variant="alert">
          <div className="">
            <p className="text-[14px]  pb-[5px]">Moje pojazdy</p>
            <div className="flex gap-[12px] items-center">
              <h3 className="">3</h3>
              {true && <AlertTriangle className="text-alert" />}
            </div>
            <p className="text-[14px]  pt-[5px]">aktywnych</p>
          </div>
          <IconWrapper variant="alert">
            <CarFront />
          </IconWrapper>
        </BlockWrapper>

        <BlockWrapper className="flex justify-between" variant="warning">
          <div className="">
            <p className="text-[14px]  pb-[5px]">Moje pojazdy</p>
            <div className="flex gap-[12px] items-center">
              <h3 className="">3</h3>
              {false && <AlertTriangle className="text-alert" />}
            </div>
            <p className="text-[14px] pt-[5px]">aktywnych</p>
          </div>
          <IconWrapper variant="warning">
            <CarFront />
          </IconWrapper>
        </BlockWrapper>
      </GridWrapper>

      <BlockWrapper>
        <div className="">
          <p className="text-[18px] text-content-primary font-semibold mb-[8px]">
            Nadchodzące terminy
          </p>
          <p className="text-[14px] text-content-primary">
            Liczba pojazdów wymagających uwagi w najbliższym czasie
          </p>
        </div>

        <div className="mt-[24px] grid lg:grid-cols-2 grid-cols-1 gap-[24px] items-center justify-between">
          <div className="p-[20px] rounded-[7px] border border-icon bg-bg-page">
            <div className="flex gap-[12px] items-center">
              <IconWrapper className="!w-[25px] !h-[25px]">
                <Wrench className="text-info" size={16} />
              </IconWrapper>
              <p className="text-[14px] font-bold text-content-primary">Przeglądy techniczne</p>
            </div>

            <div className="mt-[24px] gap-[16px] grid sm:grid-cols-3 grid-cols-1">
              <div className="px-[12px] py-[12px] border border-icon rounded-[7px]">
                <p className="text-center text-[25px] text-content-primary font-bold">0</p>
                <p className="text-center text-[12px]">≤ 7 dni</p>
              </div>
              <div className="px-[12px] py-[12px] border border-icon rounded-[7px]">
                <p className="text-center text-[25px] text-content-primary font-bold">0</p>
                <p className="text-center text-[12px]">≤ 30 dni</p>
              </div>
              <div className="px-[12px] py-[12px] border border-icon rounded-[7px]">
                <p className="text-center text-[25px] text-content-primary font-bold">0</p>
                <p className="text-center text-[12px]">≤ 60 dni</p>
              </div>
            </div>
          </div>

          <div className="p-[20px] rounded-[7px] border border-icon bg-bg-page">
            <div className="flex gap-[12px] items-center">
              <IconWrapper className="!w-[25px] !h-[25px]">
                <Wrench className="text-info" size={16} />
              </IconWrapper>
              <p className="text-[14px] font-bold text-content-primary">Ubezpieczenia (OC / AC)</p>
            </div>

            <div className="mt-[24px] gap-[16px] grid sm:grid-cols-3 grid-cols-1">
              <div className="px-[12px] py-[12px] border border-icon rounded-[7px]">
                <p className="text-center text-[25px] text-content-primary font-bold">0</p>
                <p className="text-center text-[12px]">≤ 7 dni</p>
              </div>
              <div className="px-[12px] py-[12px] border border-icon rounded-[7px]">
                <p className="text-center text-[25px] text-content-primary font-bold">0</p>
                <p className="text-center text-[12px]">≤ 7 dni</p>
              </div>
              <div className="px-[12px] py-[12px] border border-icon rounded-[7px]">
                <p className="text-center text-[25px] text-content-primary font-bold">0</p>
                <p className="text-center text-[12px]">≤ 7 dni</p>
              </div>
            </div>
          </div>
        </div>
      </BlockWrapper>

      <Reminders data={reminderArr} title="Pilne przypomnienia" />
    </>
  );
}
