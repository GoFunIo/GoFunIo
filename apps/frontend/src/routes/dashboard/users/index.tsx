import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/users/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Użytkownicy"
        subtitle="Wszyscy użytkownicy systemu i przypisane pojazdy."
        button={{
          label: 'Dodaj użytkownika',
          onClick: () => {},
        }}
      />
    </>
  );
}
