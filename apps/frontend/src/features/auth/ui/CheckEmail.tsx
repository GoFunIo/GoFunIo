import { Button } from '@/components/ui/Button';
import { Mail } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

type Props = {
  title: string;
  subtitle: string;
};

export const CheckEmail = ({ title, subtitle }: Props) => {
  const navigate = useNavigate();

  return (
    <section className="px-[20px] bg-bg-section flex items-center justify-center h-full">
      <div className="bg-bg-card max-w-[460px] w-full rounded-[15px] shadow-[0_4px_13px_0_rgba(0,0,0,0.2)] md:py-[70px] md:px-[50px] py-[50px] px-[30px]">
        <Mail
          size={48}
          strokeWidth={1.5}
          className="m-auto mb-[20px] text-content-primary transition-colors duration-200"
        />
        <h3 className="text-center pb-[16px]">{title}</h3>
        <p className="text-center">{subtitle}</p>
        <Button onClick={() => navigate({ to: '/login' })} className="mt-[24px] w-full">
          POWRÓT DO LOGOWANIA
        </Button>
      </div>
    </section>
  );
};
