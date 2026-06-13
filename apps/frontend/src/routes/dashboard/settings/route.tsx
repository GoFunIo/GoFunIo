import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { SettingTabs } from '@/features/dashboard/widgets/SettingsTabs';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <>
      <DashboardHeader
        title="Ustawienia"
        subtitle="Centrum administracyjne - zarządzaj swoim kontem"
      />
      <SettingTabs />
      <Outlet />
    </>
  );
}
