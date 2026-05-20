import { Button } from '@/components/ui/Button';
import { resendVerification } from '@/features/auth/auth.api';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/verify-email/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const isTokenValid = true;
  const data = {
    email: 'test@gmail.com',
  };

  const resendEmail = async () => {
    try {
      await resendVerification(data);
    } catch {}
  };

  if (!isTokenValid) {
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
