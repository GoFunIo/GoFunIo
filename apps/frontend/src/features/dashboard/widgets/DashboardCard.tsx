import React from 'react';
import classNames from 'classnames';
import { TriangleAlert } from 'lucide-react';
import { calculateDaysToDate, isDateString } from '@/utils/calculateDaysToDate';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  isAlert?: boolean;
}

export const DashboardCard = ({
  title,
  value,
  subtitle,
  icon,
  isAlert = false,
}: DashboardCardProps) => {
  let displayValue = value;
  let displayTitle = title;
  let variant: 'neutral' | 'warning' | 'alert' = 'neutral';
  let showAlertIcon = false;

  if (isDateString(value)) {
    const { days, isPast, text } = calculateDaysToDate(String(value));
    displayValue = text;

    if (isPast) {
      displayTitle = 'Termin minął:';
      variant = 'alert';
      showAlertIcon = true;
    } else {
      if (title.toLowerCase().includes('przegląd')) {
        displayTitle = 'Następny przegląd za:';
      } else {
        displayTitle = `${title} za:`;
      }

      if (days <= 7) {
        variant = 'alert';
        showAlertIcon = true;
      } else if (days >= 8 && days <= 30) {
        variant = 'warning';
        showAlertIcon = false;
      }
    }
  } else if (isAlert) {
    variant = 'alert';
    showAlertIcon = false;
  }

  return (
    <div
      className={classNames(
        'w-full border rounded-[7px] p-[25px] flex justify-between items-start custom-transition min-h-[100px]',
        {
          'bg-bg-card border-icon text-content-primary': variant === 'neutral',
          'bg-alert-bg border-alert text-content-primary': variant === 'alert',
          'bg-warning-bg border-warning text-content-primary': variant === 'warning',
        },
      )}
    >
      <div className="flex flex-col justify-between h-full flex-1 pr-2">
        <span className="text-[14px] text-content-secondary font-medium block mb-1.5">
          {displayTitle}
        </span>

        <div className="flex items-center gap-6 mb-1.5">
          <span className="text-[30px] font-bold leading-none tracking-tight">{displayValue}</span>
          {showAlertIcon && (
            <TriangleAlert size={22} className="text-alert shrink-0" strokeWidth={2} />
          )}
        </div>

        {subtitle && (
          <span className="text-[13px] text-content-secondary font-medium block">{subtitle}</span>
        )}
      </div>

      <div
        className={classNames(
          'w-[44px] h-[44px] rounded-[6px] flex items-center justify-center shrink-0',
          {
            'bg-info-bg-icon text-primary': variant === 'neutral',
            'bg-alert-bg-icon text-alert': variant === 'alert',
            'bg-warning-bg-icon text-warning': variant === 'warning',
          },
        )}
      >
        {icon}
      </div>
    </div>
  );
};
