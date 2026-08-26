import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Filters } from '@/features/dashboard/widgets/Filters';
import { serviceColumns } from '@/store/serviceTable';
import { createFileRoute } from '@tanstack/react-router';
import { useService, useServices } from '@/features/dashboard/hooks/services.hooks';
import { ServiceData } from '@/features/dashboard/types';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useState } from 'react';
import { Modal } from '@/features/dashboard/ui/Modal';
import { VehiclesServiceForm } from '@/features/dashboard/forms/VehiclesServicesForm';
import { DeleteServiceConfirm } from '@/features/dashboard/forms/DeleteServiceConfirm';

export const Route = createFileRoute('/dashboard/service/')({
  component: RouteComponent,
});

type ServiceIdType = string | null;
type ModalType = 'create' | 'edit' | 'delete' | null;

function RouteComponent() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceIdType>(null);

  const { data: servicesResponse, isPending: allServicesPending } = useServices();
  const { data: activeService, isPending: isServiceLoading } = useService(selectedServiceId);

  const services: ServiceData[] = servicesResponse?.items ?? [];
  const totalCost = services.reduce((sum, service) => sum + Number(service.cost), 0).toFixed(2);

  const openServiceModal = (modal: ModalType, serviceId?: string) => {
    setActiveModal(modal);

    if (serviceId) {
      setSelectedServiceId(serviceId);
    }
  };

  const closeServiceModal = () => {
    setActiveModal(null);
    setSelectedServiceId(null);
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
      // return {
      //   title: 'Edytuj wpis serwisowy',
      //   subtitle: 'Zaktualizuj szczegóły czynności serwisowej dla tego pojazdu.',
      //   content: singleServicePending ? (
      //     <LoadingIcon className="m-auto my-[24px]" />
      //   ) : activeService ? (
      //     <VehiclesServiceForm
      //       mode="edit"
      //       service={activeService}
      //       onClose={() => setActiveModal(null)}
      //     />
      //   ) : null,
      // };
      case 'delete':
        return {
          title: 'Usuń wpis serwisowy',
          subtitle:
            'Czy na pewno chcesz usunąć ten wpis z historii serwisowej? Ta operacja jest nieodwracalna.',
          content: isServiceLoading ? (
            <LoadingIcon className="m-auto my-16" />
          ) : activeService ? (
            <DeleteServiceConfirm service={activeService} onClose={closeServiceModal} />
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

      {allServicesPending ? (
        <BlockWrapper>
          <LoadingIcon className="m-auto my-[24px]" />
        </BlockWrapper>
      ) : services.length === 0 ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak wpisów serwisowych" />
        </BlockWrapper>
      ) : (
        <DataTable
          columns={serviceColumns}
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
