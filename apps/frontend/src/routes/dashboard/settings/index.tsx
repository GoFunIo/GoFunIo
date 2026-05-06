import { BlockWrapper } from '@/features/dashboard/layout/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/layout/DashboardHeader';
import { GridWrapper } from '@/features/dashboard/layout/GridWrapper';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader title="Ustawienia" subtitle="Zarządzaj swoim kontem i subskrypcją." />

      <GridWrapper layout="2-equal">
        <BlockWrapper>Test</BlockWrapper>
        <BlockWrapper>Test</BlockWrapper>
      </GridWrapper>

      <GridWrapper layout="2-equal">
        <BlockWrapper>Test</BlockWrapper>
      </GridWrapper>

      <GridWrapper layout="2-equal">
        <BlockWrapper>Test</BlockWrapper>
      </GridWrapper>
    </>
  );
}
