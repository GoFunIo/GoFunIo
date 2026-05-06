import { BlockWrapper } from '@/features/dashboard/layout/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/layout/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/timeline/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Oś czasu serwisu"
        subtitle="Chronologiczny widok wszystkich napraw i przeglądów."
      />

      <BlockWrapper>Timeline</BlockWrapper>
    </>
  );
}
