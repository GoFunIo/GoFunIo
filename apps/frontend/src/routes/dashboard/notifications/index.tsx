import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/notifications/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Powiadomienia"
        subtitle="Sam decydujesz, ile dni przed terminem (przegląd, OC, AC) chcesz dostać przypomnienie."
      />

      <GridWrapper layout="2-equal">
        <BlockWrapper>Block</BlockWrapper>
      </GridWrapper>
    </>
  );
}
