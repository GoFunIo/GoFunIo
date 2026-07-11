import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CheckEmail } from '@/features/auth/ui/CheckEmail';
import { AuthSwitch } from '@/features/auth/ui/AuthSwitch';
import { ForgotPasswordForm } from '@/features/auth/forms/ForgotPasswordForm';

export const Route = createFileRoute('/(auth)/forgot-password/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [success, setSuccess] = useState<boolean>(false);

  if (success) {
    return (
      <CheckEmail
        title="Sprawdź swoją skrzynkę e-mail"
        subtitle="Jeśli konto istnieje, wysłaliśmy wiadomość z dalszymi instrukcjami."
      />
    );
  }

  return (
    <AuthWrapper
      title="Nie pamiętasz hasła?"
      subtitle="Wprowadź swój e-mail, a wyślemy link do resetu hasła."
    >
      <ForgotPasswordForm className="pt-[30px]" setSuccess={setSuccess} />
      <AuthSwitch
        type="login"
        className="mt-[10px]"
        hasTitle={false}
        customLabel="Wróć do logowania"
      />
    </AuthWrapper>
  );
}
