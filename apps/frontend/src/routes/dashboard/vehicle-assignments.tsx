import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/vehicle-assignments')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/dashboard/vehicle-assignments"!</div>;
}
