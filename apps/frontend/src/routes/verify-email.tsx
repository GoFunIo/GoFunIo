import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AuthWrapper } from 'src/components/features/auth/AuthWrapper';
import { Button } from 'src/components/ui';

export const Route = createFileRoute('/verify-email')({
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
