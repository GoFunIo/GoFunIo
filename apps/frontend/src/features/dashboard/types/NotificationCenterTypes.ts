// =========================================================================
//  ENUMY
// =========================================================================

export type DeadlineKind = 'OC' | 'AC' | 'TECHNICAL_INSPECTION';

export type NotificationCategory =
  | 'FLEET_DEADLINES'
  | 'VEHICLE_ACCESS'
  | 'MEMBERSHIP'
  | 'SERVICE'
  | 'PRODUCT';

export type NotificationType = 'VEHICLE_DEADLINE_REACHED';

export type EmailMode = 'OFF' | 'IMMEDIATE';

// =========================================================================
// PODSUMOWANIE / BADGE / Badge dzwonka korzysta wyłącznie z `unreadNotificationCount`.
// GET /notification-center/summary
// =========================================================================

export type NotificationCenterSummary = {
  activeAlertCount: number;
  unreadNotificationCount: number;
};

// =========================================================================
// AKTUALNE ALERTY POJAZDÓW
// GET /vehicle-deadline-alerts
// =========================================================================

export type VehicleDeadlineAlertsParams = {
  deadlineKind?: DeadlineKind;
  vehicleId?: string; // Alerty tylko jednego pojazdu
  overdue?: boolean; // `true` – po terminie, `false` – aktualne lub przyszłe
  limit?: number; // Rozmiar strony; domyślnie `20`
  cursor?: string;
};

export type AlertVehicleInfo = {
  brand: string;
  model: string;
  registrationNumber: string;
};

export type VehicleDeadlineAlert = {
  alertKey: string; // Stabilne ID alertu do `key` w UI
  vehicleId: string; // ID pojazdu powiązanego z alertem
  vehicle: AlertVehicleInfo; // Podstawowe dane pojazdu do wyświetlenia
  deadlineKind: DeadlineKind; // Rodzaj terminu
  deadlineDate: string; // `YYYY-MM-DD`
  daysRemaining: number; // gotowe z backendu, Liczba dni do terminu; wartość ujemna oznacza opóźnienie
  overdue: boolean; // gotowe z backendu, Czy termin już minął
};

export type VehicleDeadlineAlertsResponse = {
  items: VehicleDeadlineAlert[]; // Lista aktualnych alertów
  nextCursor: string | null;
};

// =========================================================================
// POLITYKA SETTING/NOTIFICATIONS  (tylko OWNER, ADMIN)
// GET /alert-policy, PATCH /alert-policy
// =========================================================================

export type AlertPolicy = {
  enabledDeadlineKinds: DeadlineKind[]; // Rodzaje terminów
  leadDays: number[]; // np. [30, 14, 7, 0]; 0 = dzień terminu
  timeZone: string; // IANA, np. "Europe/Warsaw"
};

export type UpdateAlertPolicyPayload = Partial<AlertPolicy>;

// =========================================================================
// LISTA NOTIFICATIONS (log zdarzeń, ma stan przeczytania/archiwizacji)
// GET /notifications
// =========================================================================

export type NotificationsListParams = {
  category?: NotificationCategory;
  unread?: boolean;
  archived?: boolean;
  limit?: number;
  cursor?: string;
};

export type NotificationAction = {
  type: 'OPEN_VEHICLE';
  vehicleId: string; // Pojazd, który należy otworzyć
};

export type NotificationItem = {
  id: string; // ID Notification
  type: NotificationType; // Typ zdarzenia; obecnie `VEHICLE_DEADLINE_REACHED`
  category: NotificationCategory;
  rendererVersion: number; // Wersja kontraktu danego typu Notification
  createdAt: string; // Czas utworzenia Notification
  readAt: string | null; // Czas przeczytania przez bieżącego użytkownika
  archivedAt: string | null; // Czas archiwizacji przez bieżącego użytkownika
  vehicleId: string; // Powiązany pojazd
  deadlineKind: DeadlineKind; // Rodzaj terminu: OC, AC lub przegląd
  deadlineDate: string; // Data terminu
  leadDay: number; // Próg, dla którego utworzono Notification
  registrationNumber: string;
  vehicle: AlertVehicleInfo;
  action: NotificationAction; // Autoryzowana akcja po kliknięciu
};

export type NotificationsListResponse = {
  items: NotificationItem[]; //  Notifications od najnowszych do najstarszych
  nextCursor: string | null;
};

// =========================================================================
// OZNACZ WSZYSTKIE JAKO PRZECZYTANE
// POST /notifications/read-all
// =========================================================================

export type ReadAllPayload = {
  category?: NotificationCategory; //Ograniczenie operacji do jednej kategorii
};

export type ReadAllResponse = {
  updatedCount: number; // Liczba Notifications, które zmieniły stan
};

// =========================================================================
// PREFERENCJE UŻYTKOWNIKA
// GET /notification-preferences/me,
// =========================================================================

export type NotificationPreference = {
  category: NotificationCategory; // Kategoria Notification
  emailMode: EmailMode; // Czy wysyłać e-mail dla tej kategorii
  showLiveToasts: boolean; // nie wyłącza SSE, refetchu, badge’a ani listy.
};

export type NotificationPreferencesResponse = {
  preferences: NotificationPreference[];
};

// =========================================================================
// PREFERENCJE UŻYTKOWNIKA
// PATCH /notification-preferences/me
// =========================================================================
export type UpdateNotificationPreferenceItem = {
  category: NotificationCategory;
  emailMode?: EmailMode;
  showLiveToasts?: boolean;
};

export type UpdateNotificationPreferencesPayload = {
  preferences: UpdateNotificationPreferenceItem[]; // 1-5 elementów
};
