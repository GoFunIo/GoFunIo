import classNames from 'classnames';
import { BoardButton } from '../ui/BoardButton';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import { TriangleAlert, CalendarCog, ShieldAlert, ShieldCheck, BellRing } from 'lucide-react';
import { VehicleData } from '../types';

export type AlertFilterType = 'all' | 'inspection' | 'insurance';

type Props = {
  data?: VehicleData[];
  onRenewCar?: (id: string) => void;
  filterType?: AlertFilterType;
  maxDays?: number;
};

const activityIcons = {
  inspection: CalendarCog,
  insurance_ac: ShieldCheck,
  insurance_oc: ShieldAlert,
};

export const Reminders = ({ data = [], onRenewCar, filterType = 'all', maxDays = 60 }: Props) => {
  const activeReminders = data
    .flatMap((car) => {
      const inspection = car.technicalInspectionExpiry
        ? calculateDaysToDate(car.technicalInspectionExpiry)
        : null;
      const oc = car.ocExpiry ? calculateDaysToDate(car.ocExpiry) : null;
      const ac = car.acExpiry ? calculateDaysToDate(car.acExpiry) : null;

      const carAlerts = [
        {
          typeKey: 'inspection' as const,
          typeLabel: 'Przegląd techniczny',
          expiryDate: car.technicalInspectionExpiry,
          days: inspection?.days ?? Infinity,
          isPast: inspection?.isPast ?? false,
        },
        {
          typeKey: 'insurance_oc' as const,
          typeLabel: 'Ubezpieczenie OC',
          expiryDate: car.ocExpiry,
          days: oc?.days ?? Infinity,
          isPast: oc?.isPast ?? false,
        },
        {
          typeKey: 'insurance_ac' as const,
          typeLabel: 'Ubezpieczenie AC',
          expiryDate: car.acExpiry,
          days: ac?.days ?? Infinity,
          isPast: ac?.isPast ?? false,
        },
      ];

      return carAlerts
        .filter((alert) => alert.expiryDate && (alert.days <= maxDays || alert.isPast))
        .filter((alert) => {
          if (!filterType || filterType === 'all') return true;
          if (filterType === 'inspection') return alert.typeKey === 'inspection';
          if (filterType === 'insurance')
            return alert.typeKey === 'insurance_oc' || alert.typeKey === 'insurance_ac';
          return true;
        })
        .map((alert) => ({
          id: `${car.id}-${alert.typeKey}`,
          carId: car.id,
          carName: `${car.brand} ${car.model}`,
          plate: car.registrationNumber,
          typeKey: alert.typeKey,
          typeLabel: alert.typeLabel,
          expiryDate: alert.expiryDate,
          days: alert.days,
          isPast: alert.isPast,
        }));
    })
    .sort((a, b) => a.days - b.days);

  if (activeReminders.length === 0) {
    return (
      <EmptyPlaceholder
        title="Brak pilnych alertow"
        className="bg-bg-card min-h-[250px]"
        icon={<BellRing size={24} className="text-primary" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {activeReminders.map((item) => {
        const Icon = activityIcons[item.typeKey];

        const isExpired = item.isPast || item.days < 0;
        const isCritical = item.days <= 7 || isExpired;
        const isWarning = item.days > 7 && item.days <= 30;

        const badgeText = isCritical ? 'Krytyczne' : 'Nadchodzące';

        return (
          <div
            key={item.id}
            className={classNames(
              'flex flex-col  sm:flex-row sm:items-center sm:justify-between gap-6 p-5 border-l-[5px] rounded-[7px] transition-colors  shadow-sm',
              {
                'border-l-alert': isCritical,
                'border-l-warning': isWarning,
                'border-l-info': !isCritical && !isWarning,
              },

              isExpired ? 'bg-alert-bg dark:bg-bg-card' : 'bg-bg-card  ',
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={classNames(
                  'w-[40px] h-[40px] rounded-[6px] flex items-center justify-center shrink-0',
                  {
                    'bg-alert-bg-icon text-alert': isCritical,
                    'bg-warning-bg-icon text-warning': isWarning,
                    'bg-info-bg-icon text-info': !isCritical && !isWarning,
                  },
                )}
              >
                <Icon size={20} />
              </div>

              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] text-content-primary font-bold">
                  {item.carName}
                  <span className="text-[14px] text-content-secondary font-normal">
                    {' · '}
                    {item.plate}
                  </span>
                </p>
                <p className="text-[12px] text-content-secondary">
                  {item.typeLabel} {' — '}
                  {isExpired ? 'termin minął' : 'termin mija'}{' '}
                  <span className="font-medium">{item.expiryDate}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 justify-start sm:justify-end">
              {isExpired && <TriangleAlert className="text-alert shrink-0" size={25} />}

              <span
                className={classNames(
                  'text-[12px] font-semibold text-white rounded-[3px] h-[35px] min-w-30 px-3 flex items-center justify-center shrink-0 tracking-wide',
                  {
                    'bg-alert': isCritical,
                    'bg-warning': isWarning,
                    'bg-info': !isCritical && !isWarning,
                  },
                )}
              >
                {badgeText}
              </span>

              <BoardButton
                onClick={() => onRenewCar?.(item.carId)}
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
