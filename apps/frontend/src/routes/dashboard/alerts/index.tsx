import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bell, TriangleAlert } from 'lucide-react';

import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { DeadlineAlertsSection } from '@/features/dashboard/widgets/DeadlineAlertsSection';
import { NotificationsInboxSection } from '@/features/dashboard/widgets/NotificationsInboxSection';

type SectionTab = 'alerts' | 'inbox';

export const Route = createFileRoute('/dashboard/alerts/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionTab>('alerts');

  return (
    <>
      <DashboardHeader
        title="Alerty"
        subtitle="Centrum alertów: przeglądy, ubezpieczenia i powiadomienia."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <BoardButton
          size="small"
          variant={section === 'alerts' ? 'default' : 'outline'}
          onClick={() => setSection('alerts')}
        >
          <TriangleAlert size={16} className="shrink-0" />
          Alerty terminów
        </BoardButton>
        <BoardButton
          size="small"
          variant={section === 'inbox' ? 'default' : 'outline'}
          onClick={() => setSection('inbox')}
        >
          <Bell size={16} className="shrink-0" />
          Skrzynka powiadomień
        </BoardButton>
      </div>

      {section === 'alerts' ? (
        <DeadlineAlertsSection />
      ) : (
        <NotificationsInboxSection
          onNavigateToVehicle={(id) =>
            navigate({ to: '/dashboard/my-cars/$carId', params: { carId: id } })
          }
        />
      )}
    </>
  );
}
