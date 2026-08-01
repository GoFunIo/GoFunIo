import { useDelayedLoading } from '@/features/dashboard/hooks/useDelayedLoading';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { PageLoading } from '@/features/dashboard/widgets/PageLoading';
import { SettingTabs } from '@/features/dashboard/widgets/SettingsTabs';
import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsLayout,
});

function SettingsLayout() {
  const isPending = useRouterState({
    select: (state) => state.status === 'pending',
  });
  const showLoading = useDelayedLoading(isPending);

  return (
    <>
      <DashboardHeader
        title="Ustawienia"
        subtitle="Centrum administracyjne - zarządzaj swoim kontem"
      />
      <SettingTabs />

      {showLoading ? <PageLoading /> : <Outlet />}
    </>
  );
}
