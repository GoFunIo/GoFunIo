import { Button } from '@/components/ui/Button';
import { getImage } from '@/utils/getImage';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)/signup/success')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <section className="px-[20px] bg-bg-section flex items-center justify-center h-full">
      <div className="bg-white max-w-[460px] w-full rounded-[15px] shadow-[0_4px_13px_0_rgba(0,0,0,0.2)] md:py-[70px] md:px-[50px] py-[50px] px-[30px]">
        <img src={getImage('email.svg')} alt="Email icon" className="m-auto mb-[20px]" />
        <h3 className="text-center pb-[16px]">Sprawdź swoją skrzynkę e-mail</h3>
        <p className="text-center">
          Wysłaliśmy link weryfikacyjny na Twój adres e-mail. Kliknij w link, aby zweryfikować swoje
          konto.
        </p>
        <Button onClick={() => navigate({ to: '/login' })} className="mt-[24px] w-full">
          POWRÓT DO LOGOWANIA
        </Button>
      </div>
    </section>
  );
}
