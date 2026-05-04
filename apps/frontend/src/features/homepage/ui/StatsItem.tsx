import { LucideIcon } from 'lucide-react';
import { useCountUp } from './../hooks/useCountUp';
import { FeatureIcon } from './FeatureIcon';

interface StatItemProps {
  value: number;
  label: string;
  suffix?: string;
  icon: LucideIcon;
}

export const StatItem = ({ value, label, suffix = '', icon }: StatItemProps) => {
  const { count, ref } = useCountUp(value);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center  p-2  rounded-[7px] md:w-[200px] lg:w-[250px] xl:w-[320px]"
    >
      <FeatureIcon icon={icon} size="md" className="mb-4 md:w-14 md:h-14 lg:w-16 lg:h-16" />

      <span className="text-[24px] lg:text-[30px] leading-none font-inter font-bold lg:mb-4 text-content-primary mb-1">
        {count.toLocaleString('pl-PL')}
        {suffix}
      </span>
      <p className="text-[16px] md:text-[14px] lg:text-[18px] text-content-secondary font-semibold  text-center mx-auto">
        {label}
      </p>
    </div>
  );
};
