import classNames from 'classnames';
import {
  LucideIcon,
  TriangleAlert,
  CalendarCog,
  ShieldAlert,
  ShieldCheck,
  BellRing,
} from 'lucide-react';
import { BoardButton } from '../ui/BoardButton';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { DeadlineKind, VehicleDeadlineAlert } from '../types';
import { deadlineKindLabels, getAlertBadgeText, getAlertVariant } from '@/utils/formatDeadline';

export type AlertFilterType = 'all' | 'inspection' | 'insurance';

type Props = {
  alerts?: VehicleDeadlineAlert[];
  onRenewCar?: (vehicleId: string) => void;
  filterType?: AlertFilterType;
};

const activityIcons: Record<DeadlineKind, LucideIcon> = {
  TECHNICAL_INSPECTION: CalendarCog,
  AC: ShieldCheck,
  OC: ShieldAlert,
};

const matchesFilter = (kind: DeadlineKind, filterType: AlertFilterType) => {
  if (filterType === 'all') return true;
  if (filterType === 'inspection') return kind === 'TECHNICAL_INSPECTION';
  return kind === 'OC' || kind === 'AC';
};

export const Reminders = ({ alerts = [], onRenewCar, filterType = 'all' }: Props) => {
  const activeReminders = alerts
    .filter((item) => matchesFilter(item.deadlineKind, filterType))
    .slice()
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  if (activeReminders.length === 0) {
    return (
      <EmptyPlaceholder
        title="Brak pilnych alertów"
        className="bg-bg-card min-h-[250px]"
        icon={<BellRing size={24} className="text-primary" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {activeReminders.map((item) => {
        const Icon = activityIcons[item.deadlineKind];
        const variant = getAlertVariant(item.daysRemaining, item.overdue);

        const isCritical = variant === 'alert';
        const isWarning = variant === 'warning';
        const isInfo = variant === 'info';

        const badgeText = isInfo
          ? 'Nadchodzące < 60d'
          : getAlertBadgeText(item.daysRemaining, item.overdue);

        return (
          <div
            key={item.alertKey}
            className={classNames(
              'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-5 border-l-[5px] rounded-[7px] transition-colors shadow-sm',
              {
                'border-l-alert': isCritical,
                'border-l-warning': isWarning,
                'border-l-info': isInfo,
              },
              item.overdue ? 'bg-alert-bg dark:bg-bg-card' : 'bg-bg-card',
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={classNames(
                  'w-[40px] h-[40px] rounded-[6px] flex items-center justify-center shrink-0',
                  {
                    'bg-alert-bg-icon text-alert': isCritical,
                    'bg-warning-bg-icon text-warning': isWarning,
                    'bg-info-bg-icon text-info': isInfo,
                  },
                )}
              >
                <Icon size={20} />
              </div>

              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] text-content-primary font-bold">
                  {item.vehicle.brand} {item.vehicle.model}
                  <span className="text-[14px] text-content-secondary font-normal">
                    {' · '}
                    {item.vehicle.registrationNumber}
                  </span>
                </p>
                <p className="text-[12px] text-content-secondary">
                  {deadlineKindLabels[item.deadlineKind]} {' — '}
                  {item.overdue ? 'termin minął' : 'termin mija'}{' '}
                  <span className="font-medium">{item.deadlineDate}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col min-[425px]:flex-row min-[425px]:items-center gap-3 shrink-0 justify-start sm:justify-end">
              {item.overdue && <TriangleAlert className="text-alert shrink-0" size={25} />}

              <span
                className={classNames(
                  'text-[12px] font-semibold text-white rounded-[3px] h-[35px] min-w-30 px-3 flex items-center justify-center shrink-0 tracking-wide',
                  {
                    'bg-alert': isCritical,
                    'bg-warning': isWarning,
                    'bg-info': isInfo,
                  },
                )}
              >
                {badgeText}
              </span>

              <BoardButton
                onClick={() => onRenewCar?.(item.vehicleId)}
                size="small"
                variant="default"
                icon="refresh"
              >
                Odnów
              </BoardButton>
            </div>
          </div>
        );
      })}
    </div>
  );
};
