import { DashboardHeader } from '@/features/dashboard/layout/DashboardHeader';
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
    </>
  );
}
