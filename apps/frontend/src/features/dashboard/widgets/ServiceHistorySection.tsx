import { useState } from 'react';

import { SERVICES_PAGE_SIZE } from '@/features/dashboard/constants/serviceOptions';
import { useServiceModal } from '@/features/dashboard/hooks/useServiceModal';
import { useServices } from '@/features/dashboard/hooks/services.hooks';
import { ServiceData, ServicesFiltersType } from '@/features/dashboard/types';
import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { Pagination } from '@/features/dashboard/ui/Pagination';
import { DataTable } from '@/features/dashboard/widgets/DataTable';
import { EmptyPlaceholder } from '@/features/dashboard/widgets/EmptyPlaceholder';
import { ServicesFilters } from '@/features/dashboard/widgets/ServicesFilters';
import { LoadingIcon } from '@/components/ui/LoadingIcon';
import { getServiceColumns } from '@/store/serviceTable';
import { formatDate } from '@/utils/formatFile';

export function ServiceHistorySection() {
  const { openModal, ServiceModal } = useServiceModal();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ServicesFiltersType>({
    vehicleId: null,
    type: null,
    providerName: null,
    from: undefined,
    to: undefined,
  });

  const { data: servicesResponse, isPending: allServicesLoading } = useServices({
    page,
    pageSize: SERVICES_PAGE_SIZE,
    vehicleId: filters.vehicleId ?? undefined,
    type: filters.type ?? undefined,
    providerName: filters.providerName ?? undefined,
    from: formatDate(filters.from),
    to: formatDate(filters.to),
  });

  const services: ServiceData[] = servicesResponse?.items ?? [];

  const handleFilterChange = (filters: ServicesFiltersType) => {
    setFilters(filters);
    setPage(1);
  };

  return (
    <>
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
            columns={getServiceColumns((service) => openModal('attachments', service.id))}
            data={services}
            onEdit={(service) => openModal('edit_service', service.id)}
            onDelete={(service) => openModal('delete_service', service.id)}
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

      {ServiceModal}
    </>
  );
}
