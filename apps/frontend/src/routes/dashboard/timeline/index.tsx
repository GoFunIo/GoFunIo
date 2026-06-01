import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { timelineArr } from '@/store/cars';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/timeline/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Oś czasu serwisu"
        subtitle="Chronologiczny widok wszystkich napraw i przeglądów."
      />

      <BlockWrapper className="flex flex-col [&>*:not(:last-child)>div:nth-child(2)]:mb-[24px]">
        {timelineArr.map((item) => {
          return (
            <div key={item.id} className="flex">
              <div className="flex shrink-0 flex-col items-center mr-[25px]">
                <div className="h-[15px] w-[15px] bg-secondary rounded-full shrink-0"></div>
                <div className="w-[1px] h-full bg-secondary"></div>
              </div>
              <div className="w-full flex-wrap flex justify-between sm:flex-row flex-col gap-[12px] sm:items-end p-[16px] bg-bg-page border border-icon rounded-[7px]">
                <div className="">
                  <p className="text-[12px]">{item.date}</p>
                  <p className="text-[14px] font-bold text-content-primary">{item.title}</p>
                  <div className="flex gap-x-[8px] flex-wrap">
                    <p className="text-[12px]">
                      {item.brand} {item.model}
                    </p>
                    <p className="text-[12px]">{item.registrationNumber}</p>
                  </div>
                </div>
                <div className="">
                  <p className="text-[12px]">Warsztat</p>
                  <p className="text-[14px] text-dark">{item.servicePlace}</p>
                </div>
                {item.notes && item.notes.length !== 0 && (
                  <div className="">
                    <p className="text-[12px]">Notatki</p>
                    <p className="text-[14px] text-dark">{item.notes}</p>
                  </div>
                )}
                <div className="md:w-fit w-full">
                  <p className="bg-bg-section rounded-[3px] h-[30px] min-w-[100px] w-fit flex items-center justify-center text-[10px] font-semibold text-content-primary">
                    {item.price} zł
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </BlockWrapper>
    </>
  );
}
