import {
  AlertPolicy,
  NotificationCenterSummary,
  NotificationItem,
  NotificationPreferencesResponse,
  NotificationsListParams,
  NotificationsListResponse,
  ReadAllPayload,
  ReadAllResponse,
  UpdateAlertPolicyPayload,
  UpdateNotificationPreferencesPayload,
  VehicleDeadlineAlertsParams,
  VehicleDeadlineAlertsResponse,
} from '@/features/dashboard/types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Współny wrapper
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się pobrać danych powiadomień.',
      //code: data?.code,
    };
  }

  return data as T;
};

// =========================================================================
// PODSUMOWANIE / BADGE
// GET /notification-center/summary
// =========================================================================
export const getNotificationCenterSummary = () =>
  request<NotificationCenterSummary>(`${API_URL}/notification-center/summary`);

// =========================================================================
// AKTUALNE ALERTY POJAZDÓW
// GET /vehicle-deadline-alerts
// =========================================================================
export const getVehicleDeadlineAlerts = (params?: VehicleDeadlineAlertsParams) => {
  const query = new URLSearchParams();

  if (params?.deadlineKind) query.set('deadlineKind', params.deadlineKind);
  if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
  if (params?.overdue !== undefined) query.set('overdue', String(params.overdue));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);

  const queryString = query.toString();

  return request<VehicleDeadlineAlertsResponse>(
    `${API_URL}/vehicle-deadline-alerts${queryString ? `?${queryString}` : ''}`,
  );
};

// =========================================================================
// POLITYKA ALERTÓW
// GET /alert-policy
// =========================================================================
export const getAlertPolicy = () => request<AlertPolicy>(`${API_URL}/alert-policy`);

// PATCH /alert-policy (tylko OWNER, ADMIN)
export const updateAlertPolicy = (payload: UpdateAlertPolicyPayload) =>
  request<AlertPolicy>(`${API_URL}/alert-policy`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// =========================================================================
// LISTA NOTIFICATIONS
// GET /notifications
// =========================================================================
export const getNotifications = (params?: NotificationsListParams) => {
  const query = new URLSearchParams();

  if (params?.category) query.set('category', params.category);
  if (params?.unread !== undefined) query.set('unread', String(params.unread));
  if (params?.archived !== undefined) query.set('archived', String(params.archived));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);

  const queryString = query.toString();

  return request<NotificationsListResponse>(
    `${API_URL}/notifications${queryString ? `?${queryString}` : ''}`,
  );
};

// =========================================================================
// SZCZEGÓŁ NOTIFICATION
// GET /notifications/{notificationId}
// =========================================================================
export const getNotification = (notificationId: string) =>
  request<NotificationItem>(`${API_URL}/notifications/${notificationId}`);

// =========================================================================
// OZNACZENIE JAKO PRZECZYTANE
// PATCH /notifications/{notificationId}/read
// =========================================================================
export const markNotificationAsRead = (notificationId: string) =>
  request<NotificationItem>(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

// =========================================================================
// ARCHIWIZACJA
// PATCH /notifications/{notificationId}/archive
// =========================================================================
export const archiveNotification = (notificationId: string) =>
  request<NotificationItem>(`${API_URL}/notifications/${notificationId}/archive`, {
    method: 'PATCH',
  });

// =========================================================================
// OZNACZENIE WSZYSTKICH JAKO PRZECZYTANE
// POST /notifications/read-all
// =========================================================================
export const markAllNotificationsAsRead = (payload?: ReadAllPayload) =>
  request<ReadAllResponse>(`${API_URL}/notifications/read-all`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });

// =========================================================================
// PREFERENCJE UŻYTKOWNIKA
// GET /notification-preferences/me
// =========================================================================
export const getNotificationPreferences = () =>
  request<NotificationPreferencesResponse>(`${API_URL}/notification-preferences/me`);

// PATCH /notification-preferences/me
export const updateNotificationPreferences = (payload: UpdateNotificationPreferencesPayload) =>
  request<NotificationPreferencesResponse>(`${API_URL}/notification-preferences/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
