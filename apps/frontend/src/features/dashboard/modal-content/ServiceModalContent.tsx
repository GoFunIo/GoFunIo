import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { VehiclesServiceForm } from '../forms/VehiclesServicesForm';
import { useService } from '../hooks/services.hooks';
import { ServiceActions, ServiceIdType } from '../types';
import { AttachmentsForm } from '../forms/AttachmentsForm';
import { EmptyPlaceholder } from '../widgets/EmptyPlaceholder';
import { DeleteServiceConfirm } from '../forms/DeleteServiceConfirm';
import { MAX_FILES_PER_UPLOAD } from '../constants/fileOptions';
import { Modal } from '../ui/Modal';

type Props = {
  activeModal: ServiceActions;
  closeModal: () => void;
  serviceId?: ServiceIdType;
};

export const ServiceModalContent = ({ activeModal, closeModal, serviceId }: Props) => {
  const { data: service, isLoading: isLoading } = useService(serviceId);

  const getModalConfig = () => {
    switch (activeModal) {
      case 'add_service':
        return {
          title: 'Dodaj wpis serwisowy',
          subtitle: 'Zapisz każdą czynność serwisową, by mieć pełną historię pojazdu.',
          content: <VehiclesServiceForm mode="create" onClose={closeModal} />,
        };

      case 'edit_service':
        return {
          title: 'Edytuj wpis serwisowy',
          subtitle: 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.',
          content: isLoading ? (
            <LoadingIcon className="m-auto my-16" />
          ) : service ? (
            <VehiclesServiceForm mode="edit" service={service} onClose={closeModal} />
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

  return (
    <Modal
      isOpen={activeModal !== null}
      setIsOpen={(isOpen) => !isOpen && closeModal()}
      title={modalConfig.title}
      subtitle={modalConfig.subtitle}
    >
      {modalConfig.content}
    </Modal>
  );
};
