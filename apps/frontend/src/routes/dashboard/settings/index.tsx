import { DashboardHeader } from '@/features/dashboard/layout/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader title="Ustawienia" subtitle="Zarządzaj swoim kontem i subskrypcją." />
    </>
  );
}
