import { createFileRoute } from '@tanstack/react-router';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { AlertPolicyCard } from '@/features/dashboard/widgets/AlertPolicyCard';
import { EmailPreferencesCard } from '@/features/dashboard/widgets/EmailPreferencesCard';

export const Route = createFileRoute('/dashboard/settings/notification')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <GridWrapper layout="2-equal">
      <AlertPolicyCard />
      <EmailPreferencesCard />
    </GridWrapper>
  );
}
