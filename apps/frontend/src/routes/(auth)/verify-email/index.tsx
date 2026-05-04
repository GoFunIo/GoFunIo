import { Button } from '@/components/ui/Button';
import { AuthWrapper } from '@/features/auth/layout/AuthWrapper';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/verify-email/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <AuthWrapper
      isSuccess={true}
      title="E-mail zweryfikowany!"
      subtitle="Twoje konto zostało aktywowane. Możesz się teraz zalogować i zacząć korzystać z AutoKeep."
    >
      <Button onClick={() => navigate({ to: '/login' })} className="mt-[24px] w-full">
        ZALOGUJ SIĘ
      </Button>
    </AuthWrapper>
  );
}
