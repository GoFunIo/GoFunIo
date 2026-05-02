import { Mail, Car, Calendar, Smartphone } from 'lucide-react';
import { StatItem } from './ui/StatsItem';
import carBg from '@/assets/img/carTop.png';

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
    <section id="stats" className="relative overflow-hidden  lg:mb-[50px] pb-17.5">
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
        <div className=" bg-white dark:bg-bg-card rounded-[15px] mt-[-150px] md:mt-[-160px] px-6 py-10 lg:py-20 xl:px-10 xl:py-30 relative  shadow-card">
          <div className="hidden md:flex absolute inset-0 justify-center pointer-events-none z-0 ">
            <img
              src={carBg}
              alt=""
              className="  md:max-w-[70%] lg:max-w-[80%]  object-contain object-bottom opacity-10 md:opacity-100"
            />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 md:grid-row-2 gap-10 lg:gap-20 items-center ">
            <div className="md:col-start-1">{renderStat('top-left')}</div>
            <div className="hidden md:block" />
            <div className="md:col-start-3">{renderStat('top-right')}</div>
            <div className="md:col-start-1">{renderStat('bottom-left')}</div>
            <div className="hidden md:block" />
            <div className="md:col-start-3">{renderStat('bottom-right')}</div>
          </div>
        </div>
      </div>
    </section>
  );
};
