import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/userdashboard')({
  component: UserDashboard,
});

function UserDashboard() {
  return <div>Hello "/UserDashboard"!</div>;
}
