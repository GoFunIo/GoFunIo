import { AddEditUserForm } from '@/features/dashboard/forms/AddEditUserForm';
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
import { useTeam } from '@/hooks/useTeam';
import { UserType } from '@/features/dashboard/types/UserTypes';
import { LoadingIcon } from '@/components/ui/LoadingIcon';

export const Route = createFileRoute('/dashboard/settings/users')({
  component: RouteComponent,
});

export function RouteComponent() {
  const { data: team, isPending } = useTeam();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

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

  // Funkcja automatycznego zapisu select
  // const handleVehicleChange = (userId: string | number, nextValue: string | number) => {
  //   console.log(`[ON_SAVE] Użytkownik ID: ${userId} -> Nowa wartość pojazdu: ${nextValue}`);

  //   setTableData((prevData) =>
  //     prevData.map((user) =>
  //       user.id === userId ? { ...user, assignedVehicleId: nextValue } : user,
  //     ),
  //   );
  // };

  const handleAddUserClick = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUserClick = (user: UserType) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUserClick = (user: UserType) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
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

  // const columns: Column<UsersTable>[] = [
  //   {
  //     header: 'Użytkownik',
  //     accessor: 'firstName',
  //     isImportant: true,
  //     render: (_, item) => item.firstName || item.lastName || 'User',
  //   },
  //   { header: 'E-mail', accessor: 'email' },
  //   { header: 'Rola', accessor: 'role' },
  //   {
  //     header: 'Przypisz pojazd',
  //     accessor: 'assignedVehicleId',
  //     render: (value, item) => {
  //       const dynamicVehicleOptions = [
  //         { value: 'none', label: '-- Brak przypisania --' },
  //         ...mockCars.map((car) => {
  //           const isCarTakenBySomeoneElse = tableData.some(
  //             (user) => user.id !== item.id && String(user.assignedVehicleId) === String(car.id),
  //           );

  //           return {
  //             value: String(car.id),
  //             label: isCarTakenBySomeoneElse
  //               ? `${car.brand} ${car.model.trim()} · ${car.registrationNumber} (zajęty)`
  //               : `${car.brand} ${car.model.trim()} · ${car.registrationNumber}`,
  //             disabled: isCarTakenBySomeoneElse,
  //           };
  //         }),
  //       ];

  //       return (
  //         <SelectWithAction
  //           options={dynamicVehicleOptions}
  //           value={value ? String(value) : 'none'}
  //           onChange={(nextValue) => handleVehicleChange(item.id, nextValue)}
  //         />
  //       );
  //     },
  //   },
  // ];

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
      {/* {filteredTeam.length === 0 ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak użytkowników" />
        </BlockWrapper>
      ) : (
        <BlockWrapper className="overflow-visible">
          <DataTable
            columns={columns}
            data={filteredTeam}
            onEdit={handleEditUserClick}
            onDelete={handleDeleteUserClick}
            footer={false}
          />
        </BlockWrapper>
      )} */}

      {/* MODAL DODAWANIA / EDYCJI */}
      <Modal
        isOpen={isUserModalOpen}
        setIsOpen={setIsUserModalOpen}
        title={selectedUser ? 'Edytuj użytkownika' : 'Dodaj użytkownika'}
        subtitle={
          selectedUser
            ? 'Zaktualizuj dane użytkownika i jego rolę.'
            : 'Utwórz nowe konto i opcjonalnie wyślij zaproszenie e-mail.'
        }
      >
        <AddEditUserForm
          initialData={selectedUser ?? undefined}
          onClose={() => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
          }}
        />
      </Modal>

      {/* MODAL USUNIĘCIA */}
      <Modal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        title="Usuń użytkownika"
        subtitle="Czy na pewno chcesz usunąć tego użytkownika z systemu? Ta operacja jest nieodwracalna."
      >
        {selectedUser && (
          <DeleteUserConfirm
            user={selectedUser}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedUser(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
