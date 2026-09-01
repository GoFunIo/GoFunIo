import { useState } from 'react';
import { DriversActions, DriverType } from '../types';
import { useNavigate } from '@tanstack/react-router';
import { AddDriverForm } from '../forms/AddDriverForm';
import { EditDriverForm } from '../forms/EditDriverForm';
import { usePermissions } from './usePermissions';
import { DeleteDriverConfirm } from '../forms/DeleteDriverConfirm';
import { VehicleCardCompact } from '../widgets/VehicleCardCompact';
import { Modal } from '../ui/Modal';

export const useDriversModal = () => {
  const navigate = useNavigate();
  const { canDeleteDrivers } = usePermissions();
  const [activeModal, setActiveModal] = useState<DriversActions>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverType | null>(null);

  const openModal = (
    ...args:
      | [modal: 'add_driver']
      | [modal: 'edit_driver' | 'delete_driver' | 'showCars_driver', driver: DriverType]
  ) => {
    const [modal, driver] = args;

    setActiveModal(modal);
    setSelectedDriver(driver ?? null);
  };

  const closeModal = () => {
    setSelectedDriver(null);
    setActiveModal(null);
  };

  const getModalConfig = () => {
    switch (activeModal) {
      case 'add_driver':
        return {
          title: 'Dodaj kierowcę',
          subtitle: 'Utwórz nowego kierowcę.',
          content: <AddDriverForm onClose={() => setActiveModal(null)} />,
        };

      case 'edit_driver':
        if (!selectedDriver) return { title: '', subtitle: '', content: null };

        return {
          title: 'Edytuj kierowcę.',
          subtitle: 'Zaktualizuj dane kierowcy.',
          content: (
            <EditDriverForm
              initialData={selectedDriver}
              onClose={() => {
                setActiveModal(null);
                setSelectedDriver(null);
              }}
            />
          ),
        };
      case 'delete_driver':
        if (!canDeleteDrivers || !selectedDriver) {
          return { title: '', subtitle: '', content: null };
        }

        return {
          title: 'Usuń kierowcę',
          subtitle:
            'Czy na pewno chcesz usunąć tego kierowcę z systemu? Ta operacja jest nieodwracalna.',
          content: (
            <DeleteDriverConfirm
              driver={selectedDriver}
              onClose={() => {
                setActiveModal(null);
                setSelectedDriver(null);
              }}
            />
          ),
        };

      case 'showCars_driver':
        if (!selectedDriver) return { title: '', subtitle: '', content: null };

        return {
          title: 'Pojazdu kierowcy.',
          subtitle: `Wszystkie pojazdy przypisane do ${selectedDriver?.firstName} ${selectedDriver?.lastName}`,
          content: (
            <div className="flex flex-col gap-7">
              {selectedDriver.activeVehicles.map((item) => {
                return (
                  <VehicleCardCompact
                    key={item.id}
                    vehicle={item}
                    onDetailsClick={(id) =>
                      navigate({
                        to: '/dashboard/my-cars/$carId',
                        params: { carId: String(id) },
                      })
                    }
                  />
                );
              })}
            </div>
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
    DriversModal: (
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
