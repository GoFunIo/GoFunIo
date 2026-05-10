import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Filters } from '@/features/dashboard/widgets/Filters';
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
    </>
  );
}
