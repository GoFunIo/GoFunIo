import { useUser } from '@/hooks/useUser';
import { DashboardHeader } from '@/modules/dashboard/shared/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <h1 className="">Loading</h1>;
  if (!user) return null;

  return (
    <>
      <DashboardHeader
        title={`Hello, ${user.email}`}
        subtitle="Oto, co dzieje się z Twoją flotą dzisiaj."
        button={{
          label: 'Dodaj pojazd',
          onClick: () => {},
        }}
      />
    </>
  );
}
