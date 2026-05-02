import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/timeline')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Oś czasu serwisu"
        subtitle="Chronologiczny widok wszystkich napraw i przeglądów."
      />
    </>
  );
}
