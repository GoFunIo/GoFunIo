import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Filters } from '@/features/dashboard/widgets/Filters';
import { serviceColumns, serviceData } from '@/store/serviceTable';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/service/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Serwis i przeglądy"
        subtitle="Pełna historia serwisowa Twojej floty"
        button={{
          label: 'Dodaj wpis serwisowy',
          onClick: () => {},
        }}
      />

      <Filters />

      {serviceData.length === 0 || !serviceData ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak wpisów spełniających filtry." />
        </BlockWrapper>
      ) : (
        <DataTable
          columns={serviceColumns}
          data={serviceData}
          onEdit={() => {}}
          onDelete={() => {}}
          footerLabel="Łącznie: 419.00 zł"
        />
      )}
    </>
  );
}
