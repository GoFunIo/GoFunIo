import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/payments/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <DashboardHeader
        title="Wybierz plan dopasowany do Ciebie"
        subtitle="Aktywuj subskrypcję, aby zachować dostęp do wszystkich funkcji po zakończeniu okresu próbnego. Anulujesz w każdej chwili."
      />
    </>
  );
}
