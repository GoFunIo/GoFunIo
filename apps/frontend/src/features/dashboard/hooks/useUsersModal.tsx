import { useState } from 'react';
import { UsersActions, UserType } from '../types';
import { Modal } from '../ui/Modal';
import { AssignedVehiclesList } from '../widgets/AssignedVehiclesList';
import { AddUserForm } from '../forms/AddUserForm';
import { EditUserForm } from '../forms/EditUserForm';
import { DeleteUserConfirm } from '../forms/DeleteUserConfirm';
import { useNavigate } from '@tanstack/react-router';

export const useUsersModal = () => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<UsersActions>(null);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const openModal = (modal: UsersActions, user?: UserType | null) => {
    setActiveModal(modal);
    setSelectedUser(user ?? null);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActiveModal(null);
  };

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
      case 'showCars':
        return {
          title: 'Pojazdy managera.',
          subtitle: `Wszystkie pojazdy przypisane do ${selectedUser?.firstName} ${selectedUser?.lastName}`,
          content: (
            <AssignedVehiclesList
              managerId={selectedUser?.id}
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
