import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { getServiceColumns } from '@/store/serviceTable';
import { createFileRoute } from '@tanstack/react-router';
import { useService, useServices } from '@/features/dashboard/hooks/services.hooks';
import { ServiceData, ServicesFiltersType } from '@/features/dashboard/types';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { Modal } from '@/features/dashboard/ui/Modal';
import { VehiclesServiceForm } from '@/features/dashboard/forms/VehiclesServicesForm';
import { DeleteServiceConfirm } from '@/features/dashboard/forms/DeleteServiceConfirm';
import { MAX_FILES_PER_UPLOAD } from '@/features/dashboard/constants/fileOptions';
import { AttachmentsForm } from '@/features/dashboard/forms/AttachmentsForm';
import { useState } from 'react';
import { SERVICES_PAGE_SIZE } from '@/features/dashboard/constants/serviceOptions';
import { Pagination } from '@/features/dashboard/ui/Pagination';
import { ServicesFilters } from '@/features/dashboard/widgets/ServicesFilters';
import { formatDate } from '@/utils/formatFile';

export const Route = createFileRoute('/dashboard/service/')({
  component: RouteComponent,
});

type ServiceIdType = string | null;

type ModalType = 'create' | 'edit' | 'delete' | 'attachments' | null;

function RouteComponent() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceIdType>(null);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ServicesFiltersType>({
    vehicleId: null,
    type: null,
    from: undefined,
    to: undefined,
  });

  const shouldFetchService =
    selectedServiceId !== null && (activeModal === 'edit' || activeModal === 'attachments');

  const { data: servicesResponse, isPending: allServicesLoading } = useServices({
    page,
    pageSize: SERVICES_PAGE_SIZE,
    vehicleId: filters.vehicleId ?? undefined,
    type: filters.type ?? undefined,
    from: formatDate(filters.from),
    to: formatDate(filters.to),
  });
  const { data: activeService, isPending: isServiceLoading } = useService(
    shouldFetchService ? selectedServiceId : null,
  );

  console.log(servicesResponse);
  console.log(filters);
  const services: ServiceData[] = servicesResponse?.items ?? [];

  const handleFilterChange = (filters: ServicesFiltersType) => {
    setFilters(filters);
    setPage(1);
  };

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

      <ServicesFilters filters={filters} onChange={handleFilterChange} />

      {allServicesLoading ? (
        <BlockWrapper>
          <LoadingIcon className="m-auto my-[24px]" />
        </BlockWrapper>
      ) : services.length === 0 ? (
        <BlockWrapper>
          <EmptyPlaceholder title="Brak wpisów serwisowych" />
        </BlockWrapper>
      ) : (
        <div className="flex flex-col flex-1">
          <DataTable
            columns={getServiceColumns((service) => openServiceModal('attachments', service.id))}
            data={services}
            onEdit={(service) => openServiceModal('edit', service.id)}
            onDelete={(service) => openServiceModal('delete', service.id)}
            footerLabel={`Łącznie: ${servicesResponse?.totalCost} zł`}
            totalLength={servicesResponse?.total}
          />
          <Pagination
            className="mt-auto pt-6"
            currentPage={servicesResponse?.page ?? page}
            totalPages={servicesResponse?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
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
