import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/notifications')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Powiadomienia"
        subtitle="Sam decydujesz, ile dni przed terminem (przegląd, OC, AC) chcesz dostać przypomnienie."
      />
    </>
  );
}
