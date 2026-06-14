import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/notifications/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <h1>Tu będą nowe powiadomienia z alertami </h1>;
}
