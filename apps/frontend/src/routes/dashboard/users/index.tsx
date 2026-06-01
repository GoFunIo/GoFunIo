import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { usersColumns, usersData } from '@/store/usersTable';
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

      {usersData.length === 0 || !usersData ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak użytkowników" />
        </BlockWrapper>
      ) : (
        <DataTable
          columns={usersColumns}
          data={usersData}
          onEdit={() => {}}
          onDelete={() => {}}
          footer={false}
        />
      )}
    </>
  );
}
