import React from 'react';
import classNames from 'classnames';
import { TriangleAlert } from 'lucide-react';

export type DashboardCardVariant = 'neutral' | 'warning' | 'alert';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: DashboardCardVariant;
  showAlertIcon?: boolean;
}

export const DashboardCard = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'neutral',
  showAlertIcon,
}: DashboardCardProps) => {
  const isEmpty = value === '' || value == null;
  const displayValue = isEmpty ? 'Brak danych' : value;
  const resolvedShowAlertIcon = showAlertIcon ?? variant === 'alert';

  return (
    <div
      className={classNames(
        'w-full border rounded-[7px] p-[25px] flex justify-between items-start custom-transition min-h-[100px]',
        {
          'bg-bg-card border-icon text-content-primary': variant === 'neutral',
          'bg-alert-bg dark:bg-bg-card border-alert text-content-primary': variant === 'alert',
          'bg-warning-bg dark:bg-bg-card border-warning text-content-primary':
            variant === 'warning',
        },
      )}
    >
      <div className="flex flex-col justify-between h-full flex-1 pr-2">
        <span className="text-[14px] text-content-secondary font-medium block mb-1.5">{title}</span>

        <div className="flex items-center gap-6 mb-1.5">
          <span className="text-[28px] font-bold leading-none tracking-tight">{displayValue}</span>
          {resolvedShowAlertIcon && !isEmpty && (
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
