import { AddEditUserForm } from '@/features/dashboard/forms/AddEditUserForm';
import { DeleteUserConfirm } from '@/features/dashboard/forms/DeleteUserConfirm';
import { UserManagementFormData } from '@/features/dashboard/lib/formValidationRules';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { Modal } from '@/features/dashboard/ui/Modal';
import { SelectWithAction } from '@/features/dashboard/ui/SelectWithAction';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { mockCars } from '@/store/cars';
import { initialUsersData, UsersTable } from '@/store/usersTable';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Column } from '@/types/table';
import { Input } from '@/components/ui/Input';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';

export const Route = createFileRoute('/dashboard/settings/users')({
  component: RouteComponent,
});

type SelectedUserType = Partial<UserManagementFormData> & { id: string | number; email: string };

export function RouteComponent() {
  const [tableData, setTableData] = useState<UsersTable[]>(initialUsersData);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Dynamiczne filtrowanie użytkowników
  const filteredTableData = tableData.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    return item.user.toLowerCase().includes(query) || item.email.toLowerCase().includes(query);
  });

  // Funkcja automatycznego zapisu select
  const handleVehicleChange = (userId: string | number, nextValue: string | number) => {
    console.log(`[ON_SAVE] Użytkownik ID: ${userId} -> Nowa wartość pojazdu: ${nextValue}`);

    setTableData((prevData) =>
      prevData.map((user) =>
        user.id === userId ? { ...user, assignedVehicleId: nextValue } : user,
      ),
    );
  };

  const handleAddUserClick = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUserClick = (user: UsersTable) => {
    const [firstName = '', lastName = ''] = user.user.split(' ');
    setSelectedUser({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName,
      lastName,
    });
    setIsUserModalOpen(true);
  };

  const handleDeleteUserClick = (user: UsersTable) => {
    const [firstName = '', lastName = ''] = user.user.split(' ');
    setSelectedUser({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName,
      lastName,
    });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      console.log('Usuwanie użytkownika o ID:', selectedUser.id);
      setTableData((prev) => prev.filter((u) => u.id !== selectedUser.id));

      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Błąd usuwania użytkownika:', error);
    }
  };

  const columns: Column<UsersTable>[] = [
    { header: 'Użytkownik', accessor: 'user', isImportant: true },
    { header: 'E-mail', accessor: 'email' },
    { header: 'Rola', accessor: 'role' },
    {
      header: 'Przypisz pojazd',
      accessor: 'assignedVehicleId',
      render: (value, item) => {
        const dynamicVehicleOptions = [
          { value: 'none', label: '-- Brak przypisania --' },
          ...mockCars.map((car) => {
            const isCarTakenBySomeoneElse = tableData.some(
              (user) => user.id !== item.id && String(user.assignedVehicleId) === String(car.id),
            );

            return {
              value: String(car.id),
              label: isCarTakenBySomeoneElse
                ? `${car.brand} ${car.model.trim()} · ${car.registrationNumber} (zajęty)`
                : `${car.brand} ${car.model.trim()} · ${car.registrationNumber}`,
              disabled: isCarTakenBySomeoneElse,
            };
          }),
        ];

        return (
          <SelectWithAction
            options={dynamicVehicleOptions}
            value={value ? String(value) : 'none'}
            onChange={(nextValue) => handleVehicleChange(item.id, nextValue)}
          />
        );
      },
    },
  ];

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

      {filteredTableData.length === 0 ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak użytkowników" />
        </BlockWrapper>
      ) : (
        <BlockWrapper className="overflow-visible">
          <DataTable
            columns={columns}
            data={tableData}
            onEdit={handleEditUserClick}
            onDelete={handleDeleteUserClick}
            footer={false}
          />
        </BlockWrapper>
      )}

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
            onConfirm={handleDeleteConfirm}
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
