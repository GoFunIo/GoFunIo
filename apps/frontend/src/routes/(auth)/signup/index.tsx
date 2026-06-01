import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { CheckEmail } from '@/features/auth/ui/CheckEmail';
import { SignupForm } from '@/features/auth/forms/SignupForm';
import { AuthSwitch } from '@/features/auth/ui/AuthSwitch';

export const Route = createFileRoute('/(auth)/signup/')({
  component: Signup,
});

function Signup() {
  const [success, setSuccess] = useState<boolean>(false);

  if (success) {
    return (
      <CheckEmail
        title="Sprawdź swoją skrzynkę e-mail"
        subtitle="Wysłaliśmy link weryfikacyjny na Twój adres e-mail. Kliknij w link, aby zweryfikować swoje konto."
      />
    );
  }

  return (
    <AuthWrapper title="Załóż darmowe konto" subtitle="Wypróbuj bezpłatnie przez 7 dni">
      <SignupForm className="pt-[30px]" setSuccess={setSuccess} />
      <AuthSwitch type="login" className="mt-[10px]" />
    </AuthWrapper>
  );
}
