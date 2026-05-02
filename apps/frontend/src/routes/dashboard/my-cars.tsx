import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/my-cars')({
  component: RouteComponent,
});

function RouteComponent() {
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
    </>
  );
}
