import { useState } from 'react';
import { ServiceActions, ServiceIdType, VehicleData } from '../types';
import { useService } from './services.hooks';
import { VehiclesServiceForm } from '../forms/VehiclesServicesForm';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { EmptyPlaceholder } from '../widgets/EmptyPlaceholder';
import { DeleteServiceConfirm } from '../forms/DeleteServiceConfirm';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';
import { AttachmentsForm } from '../forms/AttachmentsForm';
import { Modal } from '../ui/Modal';

export const useServiceModal = () => {
  const [activeModal, setActiveModal] = useState<ServiceActions>(null);
  const [serviceId, setServiceId] = useState<ServiceIdType>(null);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleData | null>(null);
  const { data: service, isLoading } = useService(serviceId);

  const openModal = (modal: ServiceActions, id?: ServiceIdType, vehicle?: VehicleData) => {
    setActiveModal(modal);
    setServiceId(id ?? null);
    setCurrentVehicle(vehicle ?? null);
  };

  const closeModal = () => {
    setServiceId(null);
    setActiveModal(null);
    setCurrentVehicle(null);
  };

  const getModalConfig = () => {
    switch (activeModal) {
      case 'add_service':
        return {
          title: 'Dodaj wpis serwisowy',
          subtitle: 'Zapisz każdą czynność serwisową, by mieć pełną historię pojazdu.',
          content: (
            <VehiclesServiceForm
              currentVehicle={currentVehicle}
              mode="create"
              onClose={closeModal}
            />
          ),
        };

      case 'edit_service':
        return {
          title: 'Edytuj wpis serwisowy',
          subtitle: 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.',
          content: isLoading ? (
            <LoadingIcon className="m-auto my-16" />
          ) : service ? (
            <VehiclesServiceForm
              currentVehicle={currentVehicle}
              mode="edit"
              service={service}
              onClose={closeModal}
            />
          ) : (
            <EmptyPlaceholder title="Wpis nie został znaleziony." />
          ),
        };
      case 'delete_service':
        return {
          title: 'Usuń wpis serwisowy',
          subtitle:
            'Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna.',
          content: isLoading ? (
            <LoadingIcon className="m-auto my-16" />
          ) : service ? (
            <DeleteServiceConfirm service={service} onClose={closeModal} />
          ) : (
            <EmptyPlaceholder title="Wpis nie został znaleziony." />
          ),
        };

      case 'attachments':
        return {
          title: `Załączniki ${service?.attachments.length}/${MAX_FILES_PER_UPLOAD}`,
          subtitle: `Pełny serwis · ${service?.vehicle.brand} ${service?.vehicle.model} · ${service?.vehicle.registrationNumber}`,
          content: isLoading ? (
            <LoadingIcon className="m-auto my-16" />
          ) : service ? (
            <AttachmentsForm mode="api" serviceId={service.id} attachments={service.attachments} />
          ) : (
            <EmptyPlaceholder title="Wpis nie został znaleziony." />
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
    ServiceModal: (
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
