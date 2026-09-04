// UWAGA: ten plik NIE liczy dni.
// Wszystkie liczby (`daysRemaining`, `overdue`) pochodzą z BE (GET /vehicle-deadline-alerts).
// Funkcje tutaj tylko:
//  - formatują to, co już przyszło z API (data → czytelny string),
//  - klasyfikują gotową liczbę dni na wariant UI (kolor/badge), co jest formatowaniem prezentacyjnym, a nie wyliczaniem terminu.

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

// reminderRow
export const getAlertRowBadgeText = (daysRemaining: number, overdue: boolean): string => {
  if (daysRemaining === 0) return 'Dzisiaj';

  if (overdue || daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return `Po terminie ${overdueDays} ${formatDays(overdueDays)}`;
  }

  const formattedDays = `${daysRemaining} ${formatDays(daysRemaining)}`;

  if (daysRemaining <= ALERT_THRESHOLD_DAYS) {
    return `Pilne ≤ ${formattedDays}`;
  }

  return `Wkrótce ≤ ${formattedDays}`;
};

// vehicleCard
export const getVehicleCardBadgeText = (mostUrgentAlert?: VehicleDeadlineAlert): string => {
  if (!mostUrgentAlert) return 'OK';
  if (mostUrgentAlert.daysRemaining === 0) return 'Dziś';
  if (mostUrgentAlert.overdue || mostUrgentAlert.daysRemaining < 0) return 'Po terminie';

  const formattedDays = `${mostUrgentAlert.daysRemaining} ${formatDays(mostUrgentAlert.daysRemaining)}`;
  return `Termin ≤ ${formattedDays}`;
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
  const shortLabel = deadlineKindShortLabels[kind];

  if (!rawDate) {
    return { title: baseTitle, value: '', variant: 'neutral' };
  }

  if (!alert) {
    return { title: baseTitle, value: formatPlDate(rawDate), variant: 'neutral' };
  }

  const variant = getCardVariant(alert);
  const value = getAlertBadgeText(alert.daysRemaining, alert.overdue);

  if (alert.overdue) {
    const title =
      kind === 'TECHNICAL_INSPECTION' ? 'Termin przeglądu minął:' : `Termin ${shortLabel} minął:`;

    return { title, value, variant };
  }

  const title = kind === 'TECHNICAL_INSPECTION' ? 'Następny przegląd za:' : `${baseTitle} za:`;

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
