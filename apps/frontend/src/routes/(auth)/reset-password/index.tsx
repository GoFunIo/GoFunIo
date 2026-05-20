import { ResetPasswordForm } from '@/features/auth/forms/ResetPasswordForm';
import { AuthSwitch } from '@/features/auth/ui/AuthSwitch';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/reset-password/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AuthWrapper
      title="Ustaw nowe hasło"
      subtitle="Hasło musi mieć min. 8 znaków i zawierać wielką oraz małą literę, cyfrę i znak specjalny."
    >
      <ResetPasswordForm className="pt-[30px]" />
      <AuthSwitch
        type="login"
        className="mt-[10px]"
        hasTitle={false}
        customLabel="Wróć do logowania"
      />
    </AuthWrapper>
  );
}
