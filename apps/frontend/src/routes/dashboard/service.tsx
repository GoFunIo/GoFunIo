import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/service')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/dashboard/service"!</div>;
}
