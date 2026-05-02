import { useUser } from '@/hooks/useUser';
import { Banner } from '@/modules/dashboard/shared/Banner';
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
      <div className="flex flex-col gap-[24px]">
        <Banner title="Plan indywidualby" subtitle="Plan aktywny do 20.12.2026" />
        <Banner type="warning" title="Plan indywidualby" subtitle="Plan aktywny do 20.12.2026" />
        <Banner
          type="alert"
          title="Plan indywidualby"
          subtitle="Aplikacja działa w trybie tylko do odczytu — nie możesz dodawać ani edytować pojazdów i wpisów serwisowych."
        />
      </div>
    </>
  );
}
