import { Link } from '@tanstack/react-router';
import { CalendarCog, ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useVehicles } from '@/features/dashboard/hooks/vehicles.hooks';
import { calculateDaysToDate } from '@/utils/calculateDaysToDate';
import classNames from 'classnames';

interface RemindersDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const activityIcons = {
  inspection: CalendarCog,
  insurance_ac: ShieldCheck,
  insurance_oc: ShieldAlert,
};

// Funkcja pomocnicza do aktywnego odmieniania slowa "termin"
const getAlertsSubtitleText = (count: number) => {
  if (count === 0) return 'Brak pilnych terminów';
  if (count === 1) return '1 termin w ciągu 30 dni';

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} terminy w ciągu 30 dni`;
  }

  return `${count} terminów w ciągu 30 dni`;
};

// Funkcja pomocnicza do odmiany dni w badgu (1 dzień / 2 dni / 5 dni)
const getDaysBadgeText = (days: number, isPast: boolean) => {
  if (isPast || days < 0) return 'Po terminie';
  if (days === 1) return '1 dzień';
  return `${days} dni`;
};

export const RemindersDropdown = ({ isOpen, onClose }: RemindersDropdownProps) => {
  const { data: vehiclesResponse, isLoading } = useVehicles();
  const vehicles = vehiclesResponse?.items ?? [];

  const urgentAlerts = vehicles
    .flatMap((car) => {
      const inspection = car.technicalInspectionExpiry
        ? calculateDaysToDate(car.technicalInspectionExpiry)
        : null;
      const oc = car.ocExpiry ? calculateDaysToDate(car.ocExpiry) : null;
      const ac = car.acExpiry ? calculateDaysToDate(car.acExpiry) : null;

      const alerts = [
        {
          typeKey: 'inspection' as const,
          label: 'Przegląd techniczny',
          expiry: car.technicalInspectionExpiry,
          days: inspection?.days ?? Infinity,
          isPast: inspection?.isPast ?? false,
        },
        {
          typeKey: 'insurance_oc' as const,
          label: 'Ubezpieczenie OC',
          expiry: car.ocExpiry,
          days: oc?.days ?? Infinity,
          isPast: oc?.isPast ?? false,
        },
        {
          typeKey: 'insurance_ac' as const,
          label: 'Ubezpieczenie AC',
          expiry: car.acExpiry,
          days: ac?.days ?? Infinity,
          isPast: ac?.isPast ?? false,
        },
      ];

      return alerts
        .filter((alert) => alert.expiry && (alert.days <= 30 || alert.isPast))
        .map((alert) => ({
          id: `${car.id}-${alert.typeKey}`,
          carName: `${car.brand} ${car.model}`,
          plate: car.registrationNumber,
          label: alert.label,
          typeKey: alert.typeKey,
          expiryDate: alert.expiry,
          days: alert.days,
          isPast: alert.isPast,
        }));
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  if (!isOpen) return null;

  return (
    <div className="shadow-sm flex flex-col p-4 sm:absolute min-[426px]:top-[64px] top-[50px] right-0 bg-bg-card min-w-[320px] sm:w-[460px] w-screen fixed z-50 border border-icon">
      {/* NAGŁÓWEK */}
      <div className="border-b border-icon pb-3">
        <h3 className="text-[14px] font-bold text-content-primary">Alerty floty</h3>
        <p className="text-[12px] text-content-secondary font-normal mt-0.5">
          {getAlertsSubtitleText(urgentAlerts.length)}
        </p>
      </div>

      {/* LISTA ALERTÓW */}
      <div className="flex flex-col divide-y  divide-icon my-1 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <p className="text-[12px] text-content-secondary p-4 text-center">Ładowanie alertów…</p>
        ) : urgentAlerts.length === 0 ? (
          <p className="text-[12px] text-content-secondary p-4 text-center">
            Wszystkie ubezpieczenia i przeglądy są aktualne!
          </p>
        ) : (
          urgentAlerts.map((item) => {
            const Icon = activityIcons[item.typeKey];
            const isCritical = item.isPast || item.days <= 7;

            return (
              <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                {/* IKONA + DANE POJAZDU */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={classNames(
                      'flex items-center justify-center w-[36px] h-[36px] rounded-[3px] shrink-0',
                      isCritical ? 'bg-alert-bg text-alert' : 'bg-warning-bg text-warning',
                    )}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <p className="text-[14px] font-bold text-content-primary truncate">
                      {item.label}
                    </p>
                    <p className="text-[12px] text-content-secondary font-normal truncate">
                      {item.carName} · {item.plate}
                    </p>
                    <p className="text-[12px] text-content-secondary font-normal">
                      {item.expiryDate}
                    </p>
                  </div>
                </div>

                {/* BADGE  */}
                <span
                  className={classNames(
                    'text-[13px] font-bold text-white px-2.5 py-1 rounded-[3px] shrink-0 text-center min-w-[55px]',
                    isCritical ? 'bg-alert' : 'bg-warning',
                  )}
                >
                  {getDaysBadgeText(item.days, item.isPast)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 border-t border-icon">
        <Link
          onClick={onClose}
          to="/dashboard/notifications"
          className="text-[14px] font-bold text-secondary hover:underline flex items-center justify-between w-full"
        >
          <span>Zobacz wszystkie powiadomienia</span>
          <ChevronRight size={18} className="text-secondary" />
        </Link>
      </div>
    </div>
  );
};
