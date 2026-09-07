import { Button } from '@/components/ui/Button';
import { resendVerification, verifyEmail } from '@/features/auth/auth.api';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckEmail } from '@/features/auth/ui/CheckEmail';

export const Route = createFileRoute('/(auth)/verify-email/')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.token) {
      throw redirect({
        to: '/signup',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [isResend, setIsResend] = useState(false);

  const { isPending, isError } = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => verifyEmail(token),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const resendEmail = async () => {
    try {
      await resendVerification(token);
      setIsResend(true);
    } catch (err) {
      console.log(err);
    }
  };

  if (isResend) {
    return (
      <CheckEmail
        title="Sprawdź swoją skrzynkę e-mail"
        subtitle="Wysłaliśmy link weryfikacyjny na Twój adres e-mail. Kliknij w link, aby zweryfikować swoje konto."
      />
    );
  }

  if (isPending) {
    return <AuthWrapper title="Weryfikuję..." subtitle="Proszę czekać..." children={undefined} />;
  }

  if (isError) {
    return (
      <AuthWrapper
        type="alert"
        title="Link weryfikacyjny wygasł"
        subtitle="Ten link był ważny przez 24 godziny od rejestracji i już nie działa. Nie martw się – możesz wygenerować nowy."
      >
        <Button onClick={resendEmail} className="mt-[24px] w-full">
          Wyślij nowy link weryfikacyjny
        </Button>
        <div className="flex justify-center gap-2 mt-[10px]">
          <p className="text-[14px] font-medium">Masz już konto?</p>
          <Link to="/login" className="font-medium text-[14px] text-primary">
            Zaloguj się
          </Link>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper
      type="success"
      title="E-mail zweryfikowany!"
      subtitle="Twoje konto zostało aktywowane. Możesz się teraz zalogować i zacząć korzystać z AutoKeep."
    >
      <Button onClick={() => navigate({ to: '/login' })} className="mt-[24px] w-full">
        ZALOGUJ SIĘ
      </Button>
    </AuthWrapper>
  );
}
