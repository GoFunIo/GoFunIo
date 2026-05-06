import { BlockWrapper } from '@/features/dashboard/layout/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/layout/DashboardHeader';
import { GridWrapper } from '@/features/dashboard/layout/GridWrapper';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Pulpit floty"
        subtitle="Alerty, finanse i aktywność w jednym miejscu."
      />

      <GridWrapper layout="3-equal">
        <BlockWrapper>Test</BlockWrapper>
        <BlockWrapper>Test</BlockWrapper>
        <BlockWrapper>Test</BlockWrapper>
      </GridWrapper>

      <BlockWrapper>Terminy</BlockWrapper>
      <BlockWrapper>Przypomnienia</BlockWrapper>
    </>
  );
}
