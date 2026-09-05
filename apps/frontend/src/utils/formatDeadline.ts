import type { DeadlineKind, VehicleDeadlineAlert } from '@/features/dashboard/types';
import { formatDays } from './formatDays';

const ALERT_THRESHOLD_DAYS = 7;
const WARNING_THRESHOLD_DAYS = 30;

// =========================================================================
// FORMATOWANIE DATY (tylko display)
// =========================================================================
export const formatPlDate = (dateString?: string | null): string => {
  if (!dateString) return '';

  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;

  return `${day}.${month}.${year}`;
};

// =========================================================================
// MAPOWANIE LICZBY DNI Z BE na wariant alertu UI
// =========================================================================
export type AlertVariant = 'alert' | 'warning' | 'info';

export const getAlertVariant = (daysRemaining: number, overdue: boolean): AlertVariant => {
  if (overdue || daysRemaining <= ALERT_THRESHOLD_DAYS) return 'alert';
  if (daysRemaining <= WARNING_THRESHOLD_DAYS) return 'warning';
  return 'info';
};

export type CardVariant = 'neutral' | 'warning' | 'alert';

export const getCardVariant = (alert?: VehicleDeadlineAlert): CardVariant => {
  if (!alert) return 'neutral';

  const variant = getAlertVariant(alert.daysRemaining, alert.overdue);
  return variant === 'info' ? 'warning' : variant;
};

// =========================================================================
// TEKSTY BADGE (na podstawie gotowych daysRemaining/overdue)
// =========================================================================
export const getAlertBadgeText = (daysRemaining: number, overdue: boolean): string => {
  if (daysRemaining === 0) return 'Dzisiaj';

  if (overdue || daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return `Po terminie ${overdueDays} ${formatDays(overdueDays)}`;
  }

  return `${daysRemaining} ${formatDays(daysRemaining)}`;
};

// Główna funkcja do etykiet badge'y w całej aplikacji (dzwonek, wiersze, karty)
export const getAlertBadgeLabel = (daysRemaining: number, overdue: boolean): string => {
  if (daysRemaining === 0) return 'Dziś';

  if (overdue || daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return overdueDays > 0
      ? `Po terminie ${overdueDays} ${formatDays(overdueDays)}`
      : 'Po terminie';
  }

  const formattedDays = `${daysRemaining} ${formatDays(daysRemaining)}`;
  return `Za: ${formattedDays}`;
};

// =========================================================================
// ETYKIETY RODZAJU TERMINU — wspólne dla Reminders / RemindersDropdown / VehicleCard
// =========================================================================
export const deadlineKindLabels: Record<DeadlineKind, string> = {
  TECHNICAL_INSPECTION: 'Przegląd techniczny',
  OC: 'Ubezpieczenie OC',
  AC: 'Ubezpieczenie AC',
};

export const deadlineKindShortLabels: Record<DeadlineKind, string> = {
  TECHNICAL_INSPECTION: 'przeglądu',
  OC: 'OC',
  AC: 'AC',
};

// Etykiety kategorii Notifications — współdzielone między /dashboard/alerts
//  i /dashboard/settings/notification (preferencje).
export type NotificationCategory =
  | 'FLEET_DEADLINES'
  | 'VEHICLE_ACCESS'
  | 'MEMBERSHIP'
  | 'SERVICE'
  | 'PRODUCT';

export const notificationCategoryLabels: Record<NotificationCategory, string> = {
  FLEET_DEADLINES: 'Terminy floty',
  VEHICLE_ACCESS: 'Przypisanie pojazdów do użytkowników',
  MEMBERSHIP: 'Zespół i uprawnienia',
  SERVICE: 'Serwis, przeglądy i ubezpieczenia',
  PRODUCT: 'Nowości produktowe',
};

// =========================================================================
// TYTUŁ + WARTOŚĆ KAFELKA DashboardCard NA STRONIE POJEDYNCZEGO POJAZDU
// =========================================================================
export type DeadlineCardVisual = {
  title: string;
  value: string;
  variant: CardVariant;
};

export const getDeadlineCardVisual = (
  baseTitle: string,
  kind: DeadlineKind,
  rawDate: string | null | undefined,
  alert?: VehicleDeadlineAlert,
): DeadlineCardVisual => {
  const isInspection = kind === 'TECHNICAL_INSPECTION';
  const formattedBaseTitle = isInspection ? 'Przegląd techniczny' : baseTitle;
  const shortLabel = deadlineKindShortLabels[kind];
  const variant = getCardVariant(alert);

  if (!rawDate) {
    return { title: formattedBaseTitle, value: '', variant: 'neutral' };
  }

  if (!alert) {
    return { title: formattedBaseTitle, value: formatPlDate(rawDate), variant: 'neutral' };
  }

  if (alert.daysRemaining === 0) {
    const title = isInspection ? 'Termin przeglądu:' : `Termin ${shortLabel}:`;
    return { title, value: 'Dzisiaj', variant };
  }

  if (alert.overdue) {
    const title = isInspection ? 'Termin przeglądu minął:' : `Termin ${shortLabel} minął:`;
    const days = Math.abs(alert.daysRemaining);
    const value = `${days} ${formatDays(days)} temu`;

    return { title, value, variant };
  }

  const title = isInspection ? 'Następny przegląd za:' : `${baseTitle} za:`;
  const value = `${alert.daysRemaining} ${formatDays(alert.daysRemaining)}`;

  return { title, value, variant };
};

// =========================================================================
// NAJPILNIEJSZY ALERT Z LISTY (do badge'a na VehicleCard w gridzie my-cars)
// "Najpilniejszy" = ten, który wymaga reakcji najszybciej
// =========================================================================
export const pickMostUrgentAlert = (
  alerts?: VehicleDeadlineAlert[],
): VehicleDeadlineAlert | undefined => {
  if (!alerts || alerts.length === 0) return undefined;

  return [...alerts].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;

    return a.daysRemaining - b.daysRemaining;
  })[0];
};

// =========================================================================
// ETYKIETA/BADGE PROGU DNI (leadDay)  NA DZWONECZKU
// =========================================================================
export const getLeadDayLabel = (leadDay: number): string => {
  if (leadDay === 0) return 'Dzień terminu';
  return `Zostało: ${leadDay} ${formatDays(leadDay)}`;
};

// Kolor badge'a progu
export const getLeadDayVariant = (leadDay: number): AlertVariant => {
  if (leadDay <= ALERT_THRESHOLD_DAYS) return 'alert';
  if (leadDay <= WARNING_THRESHOLD_DAYS) return 'warning';
  return 'info';
};
