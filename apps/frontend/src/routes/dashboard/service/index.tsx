import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { Filters } from '@/features/dashboard/widgets/Filters';
import { serviceColumns } from '@/store/serviceTable';
import { createFileRoute } from '@tanstack/react-router';
import { useServices } from '@/features/dashboard/hooks/services.hooks';
import { ServiceData } from '@/features/dashboard/types';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { useState } from 'react';
import { Modal } from '@/features/dashboard/ui/Modal';
import { VehiclesServiceForm } from '@/features/dashboard/forms/VehiclesServicesForm';

export const Route = createFileRoute('/dashboard/service/')({
  component: RouteComponent,
});

type ModalType = 'create' | 'edit' | 'delete' | null;

function RouteComponent() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { data: servicesResponse, isPending: allServicesPending } = useServices();

  const services: ServiceData[] = servicesResponse?.items ?? [];
  const totalCost = services.reduce((sum, service) => sum + Number(service.cost), 0).toFixed(2);

  // console.log(services)
  const getModalConfig = () => {
    switch (activeModal) {
      case 'create':
        return {
          title: 'Dodaj wpis serwisowy',
          subtitle: 'Zapisz każdą czynność serwisową, by mieć pełną historię pojazdu.',
          content: <VehiclesServiceForm mode="create" onClose={() => setActiveModal(null)} />,
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
          content: <></>,
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
          onClick: () => setActiveModal('create'),
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
          onEdit={() => {}}
          onDelete={() => {}}
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
