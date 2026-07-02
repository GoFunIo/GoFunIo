import { Button } from '@/components/ui/Button';
import { ResetPasswordForm } from '@/features/auth/forms/ResetPasswordForm';
import { AuthSwitch } from '@/features/auth/ui/AuthSwitch';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/(auth)/reset-password/')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.token) {
      throw redirect({
        to: '/forgot-password',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [success, setSuccess] = useState<boolean>(false);
  const [expired, setExpired] = useState<boolean>(false);

  if (success) {
    return (
      <AuthWrapper
        type="success"
        title="Hasło zostało zmienione"
        subtitle="Możesz się teraz zalogować używając nowego hasła"
      >
        <Button onClick={() => navigate({ to: '/login' })} className="mt-[24px] w-full">
          ZALOGUJ SIĘ
        </Button>
      </AuthWrapper>
    );
  }

  if (expired) {
    return (
      <AuthWrapper
        type="alert"
        title="Link jest już nieważny"
        subtitle="Link był aktywny przez 24 godziny i można go było wykorzystać tylko raz. Upłynął jego termin ważności lub został już użyty. Nie martw się – możesz wygenerować nowy."
      >
        <Button onClick={() => navigate({ to: '/forgot-password' })} className="mt-[24px] w-full">
          ZMIEŃ HASŁO
        </Button>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper
      title="Ustaw nowe hasło"
      subtitle="Hasło musi mieć min. 8 znaków i zawierać wielką oraz małą literę, cyfrę i znak specjalny."
    >
      <ResetPasswordForm
        className="pt-[30px]"
        setSuccess={setSuccess}
        setExpired={setExpired}
        token={token}
      />
      <AuthSwitch
        type="login"
        className="mt-[10px]"
        hasTitle={false}
        customLabel="Wróć do logowania"
      />
    </AuthWrapper>
  );
}
