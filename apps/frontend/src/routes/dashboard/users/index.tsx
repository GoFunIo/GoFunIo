import { AddEditUserForm } from '@/features/dashboard/forms/AddEditUserForm';
import { UserManagementFormData } from '@/features/dashboard/lib/formValidationRules';
import { DeleteUserConfirm } from '@/features/dashboard/forms/DeleteUserConfirm';
import { Modal } from '@/features/dashboard/ui/Modal';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { usersColumns, usersData } from '@/store/usersTable';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/users/')({
  component: RouteComponent,
});

type SelectedUserType = Partial<UserManagementFormData> & { id: string | number; email: string };

function RouteComponent() {
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUserType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const handleAddUserClick = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUserClick = (user: SelectedUserType) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUserClick = (user: SelectedUserType) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      console.log('Usuwanie użytkownika o ID:', selectedUser.id);
      // Miejsce na API : await axios.delete(`/api/users/${selectedUser.id}`);

      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Błąd usuwania użytkownika:', error);
    }
  };

  const mockUser: SelectedUserType = {
    id: 2,
    firstName: 'Marek',
    lastName: 'Nowak',
    email: 'admin@autokeep.pl',
    role: 'Admin',
  };

  return (
    <>
      <DashboardHeader
        title="Użytkownicy"
        subtitle="Wszyscy użytkownicy systemu i przypisane pojazdy."
        button={{
          label: 'Dodaj użytkownika',
          onClick: handleAddUserClick,
        }}
      />
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => handleEditUserClick(mockUser)}
          className="px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 custom-transition"
        >
          Testuj Edycję (Marek Nowak)
        </button>

        <button
          onClick={() => handleDeleteUserClick(mockUser)}
          className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded hover:bg-red-200 custom-transition"
        >
          Testuj Usuwanie (Marek Nowak)
        </button>
      </div>

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
