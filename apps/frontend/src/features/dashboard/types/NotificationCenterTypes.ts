export type DeadlineKind = 'OC' | 'AC' | 'TECHNICAL_INSPECTION';

export type NotificationCategory =
  | 'FLEET_DEADLINES'
  | 'VEHICLE_ACCESS'
  | 'MEMBERSHIP'
  | 'SERVICE'
  | 'PRODUCT';

export type NotificationType = 'VEHICLE_DEADLINE_REACHED';

export type EmailMode = 'OFF' | 'IMMEDIATE';

// GET /notification-center/summary
export type NotificationCenterSummary = {
  activeAlertCount: number;
  unreadNotificationCount: number;
};

// GET /vehicle-deadline-alerts
export type VehicleDeadlineAlertsParams = {
  deadlineKind?: DeadlineKind;
  vehicleId?: string;
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
  alertKey: string;
  vehicleId: string;
  vehicle: AlertVehicleInfo;
  deadlineKind: DeadlineKind;
  deadlineDate: string;
  daysRemaining: number; // gotowe z backendu, Liczba dni do terminu; wartość ujemna oznacza opóźnienie
  overdue: boolean; // gotowe z backendu, Czy termin już minął
};

export type VehicleDeadlineAlertsResponse = {
  items: VehicleDeadlineAlert[];
  nextCursor: string | null;
};

// GET /alert-policy, PATCH /alert-policy    POLITYKA SETTING/NOTIFICATIONS  (tylko OWNER, ADMIN)
export type AlertPolicy = {
  enabledDeadlineKinds: DeadlineKind[];
  leadDays: number[]; // domyslnie  [30, 14, 7, 0]; 0 = dzień terminu
  timeZone: string;
};

export type UpdateAlertPolicyPayload = Partial<AlertPolicy>;

// GET /notifications  log zdarzeń
export type NotificationsListParams = {
  category?: NotificationCategory;
  unread?: boolean;
  archived?: boolean;
  limit?: number;
  cursor?: string;
};

export type NotificationAction = {
  type: 'OPEN_VEHICLE';
  vehicleId: string;
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  rendererVersion: number;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  vehicleId: string;
  deadlineKind: DeadlineKind; // Rodzaj terminu: OC, AC lub przegląd
  deadlineDate: string; // Data terminu
  leadDay: number; // Próg, dla którego utworzono Notification
  vehicle: AlertVehicleInfo;
  action: NotificationAction;
};

export type NotificationsListResponse = {
  items: NotificationItem[]; //  Notifications od najnowszych do najstarszych
  nextCursor: string | null;
};

// POST /notifications/read-all
export type ReadAllPayload = {
  category?: NotificationCategory;
};

export type ReadAllResponse = {
  updatedCount: number;
};

// GET /notification-preferences/me,
export type NotificationPreference = {
  category: NotificationCategory;
  emailMode: EmailMode;
  showLiveToasts: boolean;
};

export type NotificationPreferencesResponse = {
  preferences: NotificationPreference[];
};

// PATCH /notification-preferences/me
export type UpdateNotificationPreferenceItem = {
  category: NotificationCategory;
  emailMode?: EmailMode;
  showLiveToasts?: boolean;
};

export type UpdateNotificationPreferencesPayload = {
  preferences: UpdateNotificationPreferenceItem[];
};
