import classNames from 'classnames';
import { BoardButton } from '../ui/BoardButton';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import { AlertTriangle } from 'lucide-react';

export interface CarReminderItem {
  id: number;
  brand: string;
  model: string;
  registrationNumber: string;
  technicalInspectionExpiry: string;
  ocExpiry: string;
  acExpiry: string;
}

type Props = {
  data?: CarReminderItem[];
  onRenewCar?: (id: number) => void;
  filterType?: 'inspection' | 'insurance';
};

export const Reminders = ({ data = [], onRenewCar, filterType }: Props) => {
  const activeReminders = data
    .flatMap((car) => {
      const inspection = calculateDaysToDate(car.technicalInspectionExpiry);
      const oc = calculateDaysToDate(car.ocExpiry);
      const ac = calculateDaysToDate(car.acExpiry);

      const carAlerts = [
        {
          type: 'Przegląd techniczny',
          days: inspection.days,
          isPast: inspection.isPast,
          text: inspection.text,
        },
        { type: 'Ubezpieczenie OC', days: oc.days, isPast: oc.isPast, text: oc.text },
        { type: 'Ubezpieczenie AC', days: ac.days, isPast: ac.isPast, text: ac.text },
      ];

      return carAlerts
        .filter((alert) => alert.days <= 30 || alert.isPast)
        .filter((alert) => {
          if (!filterType) return true;

          if (filterType === 'inspection') {
            return alert.type === 'Przegląd techniczny';
          }

          if (filterType === 'insurance') {
            return alert.type === 'Ubezpieczenie OC' || alert.type === 'Ubezpieczenie AC';
          }

          return true;
        })
        .map((alert) => ({
          id: `${car.id}-${alert.type}`,
          carId: car.id,
          carName: `${car.brand} ${car.model}`,
          plate: car.registrationNumber,
          type: alert.type,
          days: alert.days,
          text: alert.text,
          isPast: alert.isPast,
        }));
    })

    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  return (
    <>
      {activeReminders.length === 0 ? (
        <EmptyPlaceholder title="Brak pilnych przypomnień" className="min-h-[240px] " />
      ) : (
        <div className="mt-6 flex flex-col gap-[24px]">
          {activeReminders.map((item) => {
            const isCritical = item.days <= 7 || item.isPast;
            const isWarning = item.days > 7 && item.days <= 30;

            const badgeText = item.isPast
              ? 'Po terminie'
              : isCritical
                ? 'Krytyczne'
                : 'Nadchodzące';

            return (
              <div
                key={item.id}
                className={classNames(
                  'flex flex-col sm:flex-row md:items-center md:justify-between gap-4 p-[15px] border-l-[5px] rounded-[7px] transition-colors dark:bg-bg-card ',
                  {
                    'border-alert': isCritical,
                    'border-warning': isWarning,
                    'border-info': !isCritical && !isWarning,
                  },
                  {
                    'bg-alert-bg': isCritical,
                    'bg-warning-bg': isWarning,
                    'bg-info-bg': !isCritical && !isWarning,
                  },
                )}
              >
                <div className="flex flex-col">
                  <p className="mb-1 text-[14px] text-content-primary font-bold">
                    {item.carName}
                    <span className="text-[12px] text-content-secondary font-normal">
                      {'  ·  '} {item.plate}
                    </span>
                  </p>
                  <p className="text-[12px] text-content-secondary">
                    {item.type} {'  ·  '}
                    {item.text.toLowerCase() === 'dzisiaj'
                      ? 'termin mija dzisiaj'
                      : `${item.isPast ? 'termin minął' : 'termin za'} ${item.text}`}
                  </p>
                </div>

                <div className=" flex gap-4 items-center shrink-0 sm: justify-between">
                  <div className="flex gap-4 items-center">
                    {isCritical && <AlertTriangle className="text-alert shrink-0" size={25} />}
                    <p
                      className={classNames(
                        'text-[12px] font-semibold text-white rounded-[3px] h-[30px] min-w-[100px] w-fit flex items-center justify-center transition-colors',
                        {
                          'bg-alert': isCritical,
                          'bg-warning': isWarning,
                          'bg-info': !isCritical && !isWarning,
                        },
                      )}
                    >
                      {badgeText}
                    </p>
                  </div>

                  <BoardButton
                    onClick={() => onRenewCar?.(item.carId)}
                    size="square"
                    icon="refresh"
                    variant="default"
                  ></BoardButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
