import { useState } from 'react';
import { UsersActions, UserType } from '../types';
import { Modal } from '../ui/Modal';
import { AssignedVehiclesList } from '../widgets/AssignedVehiclesList';
import { AddUserForm } from '../forms/AddUserForm';
import { EditUserForm } from '../forms/EditUserForm';
import { DeleteUserConfirm } from '../forms/DeleteUserConfirm';
import { useNavigate } from '@tanstack/react-router';
import { usePermissions } from './usePermissions';

export const useUsersModal = () => {
  const navigate = useNavigate();
  const { canManageUsers } = usePermissions();
  const [activeModal, setActiveModal] = useState<UsersActions>(null);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const openModal = (
    ...args:
      | [modal: 'add_user']
      | [modal: 'edit_user' | 'delete_user' | 'showCars_user', user: UserType]
  ) => {
    const [modal, user] = args;

    setActiveModal(modal);
    setSelectedUser(user ?? null);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActiveModal(null);
  };

  const getModalConfig = () => {
    switch (activeModal) {
      case 'add_user':
        if (!canManageUsers) return { title: '', subtitle: '', content: null };

        return {
          title: 'Dodaj użytkownika',
          subtitle: 'Utwórz nowe konto i opcjonalnie wyślij zaproszenie e-mail.',
          content: <AddUserForm onClose={() => setActiveModal(null)} />,
        };

      case 'edit_user':
        if (!selectedUser || !canManageUsers) return { title: '', subtitle: '', content: null };

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
      case 'delete_user':
        if (!selectedUser || !canManageUsers) return { title: '', subtitle: '', content: null };

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
      case 'showCars_user':
        if (!selectedUser) return { title: '', subtitle: '', content: null };

        return {
          title: 'Pojazdy managera.',
          subtitle: `Wszystkie pojazdy przypisane do ${selectedUser?.firstName} ${selectedUser?.lastName}`,
          content: (
            <AssignedVehiclesList
              managerId={selectedUser.id}
              onDetailsClick={(id) =>
                navigate({
                  to: '/dashboard/my-cars/$carId',
                  params: { carId: String(id) },
                })
              }
            />
          ),
        };
      default:
        return { title: '', subtitle: '', content: null };
    }
  };

  const modalConfig = getModalConfig();

  return {
    openModal,
    closeModal,
    UsersModal: (
      <Modal
        isOpen={activeModal !== null}
        setIsOpen={(isOpen) => !isOpen && closeModal()}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
      >
        {modalConfig.content}
      </Modal>
    ),
  };
};
