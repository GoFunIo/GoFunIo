import { Button } from '@/components/ui/Button';
import { verifyEmailChange } from '@/features/auth/email-change.api';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/verify-email-change')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.token) throw redirect({ to: '/login' });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const verification = useMutation({
    mutationFn: () => verifyEmailChange(token),
  });

  if (verification.isSuccess) {
    return (
      <AuthWrapper
        type="success"
        title="Adres e-mail został zmieniony"
        subtitle="Możesz teraz logować się przy użyciu nowego adresu."
      >
        <Button onClick={() => navigate({ to: '/login' })} className="mt-[24px] w-full">
          ZALOGUJ SIĘ
        </Button>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper
      type={verification.isError ? 'alert' : undefined}
      title={verification.isError ? 'Link jest nieważny' : 'Potwierdź zmianę adresu e-mail'}
      subtitle={
        verification.isError
          ? 'Link wygasł lub został już użyty.'
          : 'Kliknij przycisk, aby zatwierdzić nowy adres e-mail.'
      }
    >
      <Button
        onClick={() => verification.mutate()}
        disabled={verification.isPending}
        className="mt-[24px] w-full"
      >
        {verification.isPending ? 'POTWIERDZAM...' : 'POTWIERDŹ ADRES E-MAIL'}
      </Button>
    </AuthWrapper>
  );
}
