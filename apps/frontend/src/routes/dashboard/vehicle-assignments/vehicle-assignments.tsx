import { DashboardHeader } from '@/features/dashboard/layout/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/vehicle-assignments/vehicle-assignments')({
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
