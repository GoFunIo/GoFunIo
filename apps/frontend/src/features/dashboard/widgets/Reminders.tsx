import classNames from 'classnames';
import { BlockWrapper } from '../ui/BlockWrapper';
import { BoardButton } from '../ui/BoardButton';
import { AlertTriangle } from 'lucide-react';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';

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
  title: string;
  data?: CarReminderItem[];
  className?: string;
  onRenewCar?: (id: number) => void;
};

export const Reminders = ({ title, data = [], className, onRenewCar }: Props) => {
  const activeReminders = data
    .flatMap((car) => {
      const inspection = calculateDaysToDate(car.technicalInspectionExpiry);
      const oc = calculateDaysToDate(car.ocExpiry);
      const ac = calculateDaysToDate(car.acExpiry);

      const carAlerts = [
        { type: 'Przegląd techniczny', ...inspection },
        { type: 'Ubezpieczenie OC', ...oc },
        { type: 'Ubezpieczenie AC', ...ac },
      ];

      return carAlerts
        .filter((alert) => alert.days <= 60 || alert.isPast)
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

    .sort((a, b) => a.days - b.days);

  return (
    <BlockWrapper className={classNames('h-fit', className)}>
      <div className="flex gap-[10px] items-center mb-6">
        <AlertTriangle className="text-alert" size={24} />
        <h4 className="text-[18px] font-bold text-content-primary">{title}</h4>
      </div>

      {activeReminders.length === 0 ? (
        <EmptyPlaceholder title="Brak pilnych przypomnień" className="min-h-[240px] " />
      ) : (
        <div className="mt-6 flex flex-col gap-[24px]">
          {activeReminders.map((item) => {
            const isCritical = item.days <= 7 || item.isPast;
            const isWarning = item.days > 7 && item.days <= 30;

            const badgeText = item.isPast
              ? 'Przeterminowane'
              : isCritical
                ? 'Krytyczne'
                : 'Nadchodzące';

            return (
              <div
                key={item.id}
                className={classNames(
                  'gap-[16px] grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 items-start p-[15px] border-l-[5px] border-r-[1px] border-t-[1px] border-b-[1px] rounded-[7px]  transition-colors dark:bg-bg-card',
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
                <div className="">
                  <p className="mb-2 text-[14px] text-content-primary font-bold">
                    {item.carName}
                    <span className="text-content-secondary font-normal"> ({item.plate})</span>
                  </p>
                  <p className="text-[12px] text-content-secondary">
                    {item.type} — {item.isPast ? 'minął' : 'termin za'} {item.text}
                  </p>
                </div>

                <p
                  className={classNames(
                    'lg:order-none md:order-2 order-0 text-[12px] font-semibold text-white rounded-[3px] h-[30px] min-w-[120px] w-fit flex items-center justify-center transition-colors',
                    {
                      'bg-alert': isCritical,
                      'bg-warning': isWarning,
                      'bg-info': !isCritical && !isWarning,
                    },
                  )}
                >
                  {badgeText}
                </p>

                <div className="md:ml-auto flex gap-[16px]">
                  {/* <BoardButton
                    onClick={() => {}}
                    size="small"
                    variant="outline"
                    className="dark:text-white dark:bg-bg-section"
                  >
                    Ignoruj
                  </BoardButton> */}
                  <BoardButton onClick={() => onRenewCar?.(item.carId)} size="small">
                    Odnów
                  </BoardButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BlockWrapper>
  );
};
