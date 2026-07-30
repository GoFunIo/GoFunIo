import { DeleteUserConfirm } from '@/features/dashboard/forms/DeleteUserConfirm';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Column } from '@/types/table';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { UserType } from '@/features/dashboard/types/UserTypes';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { AddUserForm } from '@/features/dashboard/forms/AddUserForm';
import { EditUserForm } from '@/features/dashboard/forms/EditUserForm';
import { useTeam } from '@/features/dashboard/hooks/team.hooks';
import { usePermissions } from '@/features/dashboard/hooks/usePermissions';

export const Route = createFileRoute('/dashboard/settings/users')({
  component: RouteComponent,
});

type ModalType = 'add' | 'edit' | 'delete' | null;

function RouteComponent() {
  const { canManageTeam } = usePermissions();
  const { data: team, isPending } = useTeam(canManageTeam);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

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

  const handleAddUserClick = () => {
    setSelectedUser(null);
    setActiveModal('add');
  };

  const handleEditUserClick = (user: UserType) => {
    setSelectedUser(user);
    setActiveModal('edit');
  };

  const handleDeleteUserClick = (user: UserType) => {
    setSelectedUser(user);
    setActiveModal('delete');
  };

  const columns: Column<UserType>[] = [
    {
      header: 'Użytkownik',
      accessor: 'firstName',
      isImportant: true,
      render: (_, item) => {
        const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ');

        return fullName || 'User';
      },
    },
    { header: 'E-mail', accessor: 'email' },
    { header: 'Rola', accessor: 'role' },
  ];

  const getModalConfig = () => {
    switch (activeModal) {
      case 'add':
        return {
          title: 'Dodaj użytkownika',
          subtitle: 'Utwórz nowe konto i opcjonalnie wyślij zaproszenie e-mail.',
          content: <AddUserForm onClose={() => setActiveModal(null)} />,
        };

      case 'edit':
        if (!selectedUser) return { title: '', subtitle: '', content: null };

        return {
          title: 'Edytuj użytkownika',
          subtitle: 'Zaktualizuj dane użytkownika i jego rolę.',
          content: (
            <EditUserForm
              initialData={selectedUser}
              onClose={() => {
                setActiveModal(null);
                setSelectedUser(null);
              }}
            />
          ),
        };
      case 'delete':
        if (!selectedUser) return { title: '', subtitle: '', content: null };

        return {
          title: 'Usuń użytkownika',
          subtitle:
            'Czy na pewno chcesz usunąć tego użytkownika z systemu? Ta operacja jest nieodwracalna.',
          content: (
            <DeleteUserConfirm
              user={selectedUser}
              onClose={() => {
                setActiveModal(null);
                setSelectedUser(null);
              }}
            />
          ),
        };
      default:
        return { title: '', subtitle: '', content: null };
    }
  };

  const modalConfig = getModalConfig();

  if (!canManageTeam) {
    return (
      <BlockWrapper>
        <EmptyPlaceholder title="Nie masz uprawnień do zarządzanie zespołem" />
      </BlockWrapper>
    );
  }

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

        <BoardButton
          type="button"
          variant="default"
          size="big"
          icon="add"
          onClick={handleAddUserClick}
          className="w-full sm:w-auto sm:min-w-[180px]"
        >
          Dodaj użytkownika
        </BoardButton>
      </div>

      <BlockWrapper>
        {isPending ? (
          <LoadingIcon className="m-auto my-[24px]" />
        ) : filteredTeam.length === 0 ? (
          <EmptyPlaceholder title="Brak użytkowników" />
        ) : (
          <DataTable
            columns={columns}
            data={filteredTeam}
            onEdit={handleEditUserClick}
            onDelete={handleDeleteUserClick}
            footer={false}
          />
        )}
      </BlockWrapper>

      <Modal
        isOpen={activeModal !== null}
        setIsOpen={(isOpen) => !isOpen && setActiveModal(null)}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
      >
        {modalConfig.content}
      </Modal>
    </>
  );
}
