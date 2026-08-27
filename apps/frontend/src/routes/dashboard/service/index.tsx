import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Filters } from '@/features/dashboard/widgets/Filters';
import { getServiceColumns } from '@/store/serviceTable';
import { createFileRoute } from '@tanstack/react-router';
import { useService, useServices } from '@/features/dashboard/hooks/services.hooks';
import { ServiceData } from '@/features/dashboard/types';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { Modal } from '@/features/dashboard/ui/Modal';
import { VehiclesServiceForm } from '@/features/dashboard/forms/VehiclesServicesForm';
import { DeleteServiceConfirm } from '@/features/dashboard/forms/DeleteServiceConfirm';
import { MAX_FILES_PER_UPLOAD } from '@/features/dashboard/constants/fileOptions';
import { AttachmentsForm } from '@/features/dashboard/forms/AttachmentsForm';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/service/')({
  component: RouteComponent,
});

type ServiceIdType = string | null;
type ModalType = 'create' | 'edit' | 'delete' | 'attachments' | null;

function RouteComponent() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceIdType>(null);

  const shouldFetchService =
    selectedServiceId !== null && (activeModal === 'edit' || activeModal === 'attachments');
  const { data: servicesResponse, isPending: allServicesLoading } = useServices();
  const { data: activeService, isPending: isServiceLoading } = useService(
    shouldFetchService ? selectedServiceId : null,
  );

  const services: ServiceData[] = servicesResponse?.items ?? [];
  const totalCost = services.reduce((sum, service) => sum + Number(service.cost), 0).toFixed(2);

  const openServiceModal = (modal: ModalType, serviceId?: string) => {
    setActiveModal(modal);

    if (serviceId) {
      setSelectedServiceId(serviceId);
    }
  };

  const closeServiceModal = () => {
    setSelectedServiceId(null);
    setActiveModal(null);
  };

  const getModalConfig = () => {
    switch (activeModal) {
      case 'create':
        return {
          title: 'Dodaj wpis serwisowy',
          subtitle: 'Zapisz każdą czynność serwisową, by mieć pełną historię pojazdu.',
          content: <VehiclesServiceForm mode="create" onClose={closeServiceModal} />,
        };

      case 'edit':
        return {
          title: 'Edytuj wpis serwisowy',
          subtitle: 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.',
          content: isServiceLoading ? (
            <LoadingIcon className="m-auto my-16" />
          ) : activeService ? (
            <VehiclesServiceForm mode="edit" service={activeService} onClose={closeServiceModal} />
          ) : (
            <EmptyPlaceholder title="Wpis nie został znaleziony." />
          ),
        };
      case 'delete':
        return {
          title: 'Usuń wpis serwisowy',
          subtitle:
            'Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna.',
          content: (
            <DeleteServiceConfirm
              service={services.find((service) => service.id === selectedServiceId)!}
              onClose={closeServiceModal}
            />
          ),
        };

      case 'attachments':
        return {
          title: `Załączniki ${activeService?.attachments.length}/${MAX_FILES_PER_UPLOAD}`,
          subtitle: `Pełny serwis · ${activeService?.vehicle.brand} ${activeService?.vehicle.model} · ${activeService?.vehicle.registrationNumber}`,
          content: isServiceLoading ? (
            <LoadingIcon className="m-auto my-16" />
          ) : activeService ? (
            <AttachmentsForm
              mode="api"
              serviceId={activeService.id}
              attachments={activeService.attachments}
            />
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
    <>
      <DashboardHeader
        title="Serwis i przeglądy"
        subtitle="Pełna historia serwisowa Twojej floty"
        button={{
          label: 'Dodaj wpis serwisowy',
          onClick: () => openServiceModal('create'),
        }}
      />

      <Filters />

      {allServicesLoading ? (
        <BlockWrapper>
          <LoadingIcon className="m-auto my-[24px]" />
        </BlockWrapper>
      ) : services.length === 0 ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak wpisów serwisowych" />
        </BlockWrapper>
      ) : (
        <DataTable
          columns={getServiceColumns((service) => openServiceModal('attachments', service.id))}
          data={services}
          onEdit={(service) => openServiceModal('edit', service.id)}
          onDelete={(service) => openServiceModal('delete', service.id)}
          footerLabel={`Łącznie: ${totalCost} zł`}
        />
      )}

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
