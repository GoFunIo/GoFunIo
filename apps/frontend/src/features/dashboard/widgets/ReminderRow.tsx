import classNames from 'classnames';
import {
  LucideIcon,
  TriangleAlert,
  CalendarCog,
  ShieldAlert,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { BoardButton } from '../ui/BoardButton';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { DeadlineKind, VehicleData, VehicleDeadlineAlert } from '../types';
import { deadlineKindLabels, getAlertBadgeLabel, getAlertVariant } from '@/utils/formatDeadline';
import { useMemo } from 'react';

export type AlertFilterType = 'all' | 'inspection' | 'insurance';

type Props = {
  alerts?: VehicleDeadlineAlert[];
  vehicles: VehicleData[];
  onRenewCar?: (vehicle: VehicleData) => void;
  filterType?: AlertFilterType;
  limit?: number;
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

export const ReminderRow = ({
  alerts = [],
  vehicles = [],
  onRenewCar,
  filterType = 'all',
  limit,
}: Props) => {
  const activeReminders = useMemo(() => {
    const sorted = alerts
      .filter((item) => matchesFilter(item.deadlineKind, filterType))
      .slice()
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return limit ? sorted.slice(0, limit) : sorted;
  }, [alerts, filterType, limit]);

  if (activeReminders.length === 0) {
    return (
      <EmptyPlaceholder
        title="Brak pilnych alertów"
        className="bg-bg-card min-h-[250px]"
        icon={<CalendarCheck size={24} className="text-primary" />}
      />
    );
  }

  const handleRenewCar = (vehicleId: string) => {
    const vehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);

    if (vehicle) {
      onRenewCar?.(vehicle);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {activeReminders.map((item) => {
        const Icon = activityIcons[item.deadlineKind];
        const variant = getAlertVariant(item.daysRemaining, item.overdue);
        const badgeText = getAlertBadgeLabel(item.daysRemaining, item.overdue);

        return (
          <div
            key={item.alertKey}
            className={classNames(
              'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-5 border-l-[5px] rounded-[7px] transition-colors shadow-sm',
              {
                'border-l-alert': variant === 'alert',
                'border-l-warning': variant === 'warning',
                'border-l-info': variant === 'info',
              },
              item.overdue ? 'bg-alert-bg dark:bg-bg-card' : 'bg-bg-card',
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={classNames(
                  'w-[40px] h-[40px] rounded-[6px] flex items-center justify-center shrink-0',
                  {
                    'bg-alert-bg-icon text-alert': variant === 'alert',
                    'bg-warning-bg-icon text-warning': variant === 'warning',
                    'bg-info-bg-icon text-info': variant === 'info',
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
                    'bg-alert': variant === 'alert',
                    'bg-warning': variant === 'warning',
                    'bg-info': variant === 'info',
                  },
                )}
              >
                {badgeText}
              </span>

              <BoardButton
                onClick={() => handleRenewCar(item.vehicleId)}
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
