import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { UserType } from '@/features/dashboard/types/UserTypes';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useTeam } from '@/features/dashboard/hooks/team.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';
import { useUser } from '@/features/dashboard/hooks/user.hooks';
import { useUsersModal } from '@/features/dashboard/hooks/useUsersModal';
import { getUserColumns } from '@/store/usersTable';

export const Route = createFileRoute('/dashboard/settings/users')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user } = useUser();
  const { data: team, isPending } = useTeam();
  const { isOwner, canManageUsers } = usePermissions();
  const { openModal, UsersModal } = useUsersModal();

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamiczne filtrowanie użytkowników
  const filteredTeam = useMemo(() => {
    if (!team) return [];

    const query = searchQuery.trim().toLowerCase();

    if (!query) return team;

    return team.filter((user: UserType) => {
      const firstName = user.firstName?.toLowerCase() ?? '';
      const lastName = user.lastName?.toLowerCase() ?? '';
      const fullName = `${firstName} ${lastName}`.trim();
      const email = user.email.toLowerCase();

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        email.includes(query)
      );
    });
  }, [team, searchQuery]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full">
        <div className="w-full sm:max-w-[320px]">
          <Input
            name="searchUsers"
            placeholder="Szukaj użytkownika lub samochód"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="!min-h-[45px]"
          />
        </div>

        {canManageUsers && (
          <BoardButton
            type="button"
            variant="default"
            size="big"
            icon="add"
            onClick={() => openModal('add')}
            className="w-full sm:w-auto sm:min-w-[180px]"
          >
            Dodaj użytkownika
          </BoardButton>
        )}
      </div>

      <BlockWrapper>
        {isPending ? (
          <LoadingIcon className="m-auto my-[24px]" />
        ) : filteredTeam.length === 0 ? (
          <EmptyPlaceholder title="Brak użytkowników" />
        ) : (
          <DataTable
            columns={getUserColumns((user) => openModal('showCars', user))}
            data={filteredTeam}
            onEdit={canManageUsers ? (user) => openModal('edit', user) : undefined}
            onDelete={canManageUsers ? (user) => openModal('delete', user) : undefined}
            footer={false}
            disabled={(item) => item.id === user?.id}
            hide={(item) => !isOwner && item.role === 'OWNER'}
          />
        )}
      </BlockWrapper>

      {canManageUsers && UsersModal}
    </>
  );
}
