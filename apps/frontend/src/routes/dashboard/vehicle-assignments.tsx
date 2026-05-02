import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/vehicle-assignments')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Przypisania pojazdów"
        subtitle="Przypisuj pojazdy do użytkowników w firmie"
      />
    </>
  );
}
