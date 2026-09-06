import { useState } from 'react';
import { AddVehicleForm } from '../forms/AddVehicleForm';
import { DeleteCarConfirm } from '../forms/DeleteCarConfirm';
import { Modal } from '../ui/Modal';
import { VehicleActions, VehicleData } from '../types';
import { useNavigate } from '@tanstack/react-router';

export const useVehiclesModal = () => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<VehicleActions>(null);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);

  const openModal = (
    ...args:
      | [modal: 'add_car']
      | [modal: 'edit_car' | 'delete_car' | 'renew_car', vehicle: VehicleData]
  ) => {
    const [modal, vehicle] = args;

    setActiveModal(modal);
    setVehicle(vehicle ?? null);
  };

  const closeModal = () => {
    setVehicle(null);
    setActiveModal(null);
  };

  const getModalConfig = () => {
    switch (activeModal) {
      case 'add_car':
        return {
          title: 'Dodaj pojazd',
          subtitle: 'Wprowadź dane pojazdu. Pola oznaczone * są wymagane.',
          content: <AddVehicleForm onClose={closeModal} />,
        };

      case 'edit_car':
        if (!vehicle) return { title: '', subtitle: '', content: null };

        return {
          title: `Edytuj pojazd ${vehicle?.brand} ${vehicle?.model}`,
          subtitle:
            'Zaktualizuj dane techniczne, ubezpieczenia lub numery rejestracyjne tego pojazdu.',
          content: <AddVehicleForm initialData={vehicle} onClose={closeModal} />,
        };

      case 'renew_car':
        if (!vehicle) return { title: '', subtitle: '', content: null };

        return {
          title: `Odnów termin — ${vehicle?.brand} ${vehicle?.model}`,
          subtitle: 'Wprowadź nową datę ważności OC, AC lub przeglądu technicznego.',
          content: <AddVehicleForm initialData={vehicle} onClose={closeModal} isRenewalMode />,
        };

      case 'delete_car':
        if (!vehicle) return { title: '', subtitle: '', content: null };
        return {
          title: 'Usuń pojazd',
          subtitle:
            'Czy na pewno chcesz usunąć ten pojazd z systemu? Ta operacja jest nieodwracalna.',
          content: (
            <DeleteCarConfirm
              car={vehicle}
              onClose={closeModal}
              onDeleted={() => navigate({ to: '/dashboard/my-cars' })}
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
    VehiclesModal: (
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
