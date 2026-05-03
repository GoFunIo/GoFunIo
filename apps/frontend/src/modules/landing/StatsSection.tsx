import { Mail, Car, Calendar, Smartphone } from 'lucide-react';
import { StatItem } from './ui/StatsItem';
import carBg from '@/assets/img/carBg.png';
import { RingsIcon } from './ui/Icons';

const stats = [
  {
    icon: Mail,
    value: '50 000+',
    label: 'Wysłanych powiadomień',
    position: 'top-left',
  },
  {
    icon: Calendar,
    value: '0',
    label: 'Przegapionych przeglądów',
    position: 'top-right',
  },
  {
    icon: Car,
    value: '12 000+',
    label: 'Pojazdów w systemie',
    position: 'bottom-left',
  },
  {
    icon: Smartphone,
    value: '100%',
    label: 'Mobilny dostęp do historii auta',
    position: 'bottom-right',
  },
];

export const StatsSection = () => {
  const renderStat = (pos: string) => {
    const item = stats.find((s) => s.position === pos);
    if (!item) return null;

    const numericValue = parseInt(item.value.replace(/\s/g, '').replace('+', '').replace('%', ''));
    const suffix = item.value.includes('+') ? '+' : item.value.includes('%') ? '%' : '';

    return <StatItem icon={item.icon} value={numericValue} suffix={suffix} label={item.label} />;
  };

  return (
    <section id="stats" className="scroll-mt-20 relative overflow-hidden  lg:mb-[50px] pb-17.5">
      <div className="bg-primary h-[470px] pt-[70px] px-4">
        <div className="container lg:text-center max-w-[700px] mx-auto  text-white">
          <h2 className="text-white mb-4">Skala, która robi różnicę</h2>
          <p className="subtitle text-white">
            Dołącz do tysięcy kierowców i zarządców flot, którzy zaufali naszej technologii, aby
            całkowicie wyeliminować stres związany z serwisowaniem pojazdów.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16">
        <div
          className="bg-white dark:bg-bg-card rounded-[15px] mt-[-150px] md:mt-[-160px]
        px-0 md:px-6 py-10 lg:py-10 xl:py-20 relative  shadow-card "
        >
          <div className="hidden md:flex absolute inset-0 justify-center pointer-events-none z-0 ">
            <div className="relative flex items-bottom justify-center w-full ">
              <RingsIcon className="absolute bottom-0 left-1/2 -translate-x-1/2  h-[90%] lg:h-[100%] text-icon/40  dark:text-icon/40 animate-pulse-slow " />

              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[80%] w-auto flex items-end justify-center">
                <div className="absolute bottom-4 w-[80%] h-12 bg-dark/40 blur-[40px] rounded-[100%] scale-x-150 z-0" />
                <img
                  src={carBg}
                  alt="Auto"
                  className="relative z-10 h-full w-auto object-contain object-bottom"
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 md:grid-row-2 gap-4 lg:gap-8 items-center ">
            <div className="md:col-start-1 md:justify-self-start">{renderStat('top-left')}</div>
            <div className="hidden md:block" />
            <div className="md:col-start-3 md:justify-self-end">{renderStat('top-right')}</div>
            <div className="md:col-start-1 md:justify-self-start">{renderStat('bottom-left')}</div>
            <div className="hidden md:block" />
            <div className="md:col-start-3 md:justify-self-end">{renderStat('bottom-right')}</div>
          </div>
        </div>
      </div>
    </section>
  );
};
