import { Button } from '@/components/ui/Button';
import { acceptMembershipInvitation } from '@/features/auth/auth.api';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { useUser } from '@/hooks/useUser';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/accept-invitation')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.token) throw redirect({ to: '/login' });
  },
  component: AcceptInvitation,
});

function AcceptInvitation() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const user = useUser();
  const acceptance = useMutation({
    mutationFn: () => acceptMembershipInvitation(token),
  });

  if (user.isPending) {
    return (
      <AuthWrapper title="Wczytuję zaproszenie..." subtitle="Proszę czekać.">
        {null}
      </AuthWrapper>
    );
  }

  if (!user.data) {
    return (
      <AuthWrapper
        title="Zaloguj się, aby przyjąć zaproszenie"
        subtitle="Użyj konta przypisanego do adresu, na który wysłano zaproszenie."
      >
        <Button
          onClick={() => navigate({ to: '/login', search: { invitationToken: token } })}
          className="mt-[24px] w-full"
        >
          ZALOGUJ SIĘ
        </Button>
      </AuthWrapper>
    );
  }

  if (acceptance.isSuccess) {
    return (
      <AuthWrapper
        type="success"
        title="Zaproszenie przyjęte"
        subtitle="Nowy workspace jest dostępny na Twoim koncie."
      >
        <Button onClick={() => navigate({ to: '/dashboard' })} className="mt-[24px] w-full">
          PRZEJDŹ DO PANELU
        </Button>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper
      type={acceptance.isError ? 'alert' : undefined}
      title={acceptance.isError ? 'Nie można przyjąć zaproszenia' : 'Przyjmij zaproszenie'}
      subtitle={
        acceptance.isError
          ? 'Link wygasł, został już użyty albo należy do innego konta.'
          : 'Potwierdź, aby dodać workspace do swojego konta.'
      }
    >
      <Button
        onClick={() => acceptance.mutate()}
        disabled={acceptance.isPending}
        className="mt-[24px] w-full"
      >
        {acceptance.isPending ? 'PRZYJMUJĘ...' : 'PRZYJMIJ ZAPROSZENIE'}
      </Button>
    </AuthWrapper>
  );
}
