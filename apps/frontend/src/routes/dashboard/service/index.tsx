import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { History, ListTree } from 'lucide-react';

import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { useServiceModal } from '@/features/dashboard/hooks/useServiceModal';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { ServiceHistorySection } from '@/features/dashboard/widgets/ServiceHistorySection';
import { ServiceTimelineSection } from '@/features/dashboard/widgets/ServiceTimelineSection';

type ServiceTab = 'history' | 'timeline';

export const Route = createFileRoute('/dashboard/service/')({
  validateSearch: (search: Record<string, unknown>): { tab: ServiceTab } => ({
    tab: search.tab === 'timeline' ? 'timeline' : 'history',
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { openModal, ServiceModal } = useServiceModal();

  const setTab = (next: ServiceTab) => navigate({ search: { tab: next }, replace: true });

  return (
    <>
      <DashboardHeader
        title="Serwis i przeglądy"
        subtitle="Historia serwisowa i oś czasu Twojej floty"
        button={{
          label: 'Dodaj wpis serwisowy',
          onClick: () => openModal('add_service'),
        }}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <BoardButton
          size="small"
          variant={tab === 'history' ? 'default' : 'outline'}
          onClick={() => setTab('history')}
        >
          <History size={16} className="shrink-0" />
          Historia serwisowa
        </BoardButton>
        <BoardButton
          size="small"
          variant={tab === 'timeline' ? 'default' : 'outline'}
          onClick={() => setTab('timeline')}
        >
          <ListTree size={16} className="shrink-0" />
          Oś czasu
        </BoardButton>
      </div>

      {tab === 'history' ? <ServiceHistorySection /> : <ServiceTimelineSection />}

      {ServiceModal}
    </>
  );
}
