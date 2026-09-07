import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { useServices } from '@/features/dashboard/hooks/services.hooks';
import { serviceTypeLabels } from '@/features/dashboard/constants/serviceOptions';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/timeline/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: servicesResponse, isLoading } = useServices();
  const services = servicesResponse?.items ?? [];

  return (
    <>
      <DashboardHeader
        title="Oś czasu serwisu"
        subtitle="Chronologiczny widok wszystkich napraw i przeglądów."
      />

      {isLoading ? (
        <BlockWrapper className="min-h-[250px] flex items-center justify-center">
          <p className="text-content-secondary text-[14px]">Ładowanie...</p>
        </BlockWrapper>
      ) : services.length === 0 ? (
        <BlockWrapper className="min-h-[250px] flex items-center justify-center">
          <p className="text-content-secondary text-[14px]">Brak wpisów serwisowych.</p>
        </BlockWrapper>
      ) : (
        <BlockWrapper className="flex flex-col [&>*:not(:last-child)>div:nth-child(2)]:mb-[24px]">
          {services.map((item) => {
            const cost = Number(item.cost) || 0;

            return (
              <div key={item.id} className="flex">
                <div className="flex shrink-0 flex-col items-center mr-[25px]">
                  <div className="h-[15px] w-[15px] bg-secondary rounded-full shrink-0"></div>
                  <div className="w-[1px] h-full bg-secondary"></div>
                </div>

                <div className="w-full grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_2fr_1fr] gap-[12px] sm:items-end p-[16px] bg-bg-page border border-icon rounded-[7px]">
                  <div>
                    <p className="text-[12px]">{item.serviceDate}</p>
                    <p className="text-[14px] font-bold text-content-primary">
                      {serviceTypeLabels[item.type] ?? item.type}
                    </p>
                    <div className="flex gap-x-[8px] flex-wrap">
                      <p className="text-[12px]">
                        {item.vehicle.brand} {item.vehicle.model}
                      </p>
                      <p className="text-[12px]">{item.vehicle.registrationNumber}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[12px]">Miejsce usługi</p>
                    <p className="text-[14px] text-content-primary">{item.providerName}</p>
                  </div>

                  <div>
                    {item.notes && item.notes.length !== 0 && (
                      <>
                        <p className="text-[12px]">Notatki</p>
                        <p className="text-[14px] text-content-primary">{item.notes}</p>
                      </>
                    )}
                  </div>

                  <div className="md:w-fit w-full">
                    <p className="bg-bg-section rounded-[3px] h-[30px] min-w-[100px] w-fit flex items-center justify-center text-[10px] font-semibold text-content-primary">
                      {cost.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </BlockWrapper>
      )}
    </>
  );
}
