import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/vehicle-assignments/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Przypisania pojazdów"
        subtitle="Przypisuj pojazdy do użytkowników w firmie"
      />

      <GridWrapper layout="3-equal">
        <BlockWrapper>Block</BlockWrapper>
        <BlockWrapper>Block</BlockWrapper>
        <BlockWrapper>Block</BlockWrapper>
      </GridWrapper>
    </>
  );
}
