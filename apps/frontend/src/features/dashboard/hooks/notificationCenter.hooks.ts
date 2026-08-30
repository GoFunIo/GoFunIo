import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveNotification,
  getAlertPolicy,
  getNotification,
  getNotificationCenterSummary,
  getNotificationPreferences,
  getNotifications,
  getVehicleDeadlineAlerts,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateAlertPolicy,
  updateNotificationPreferences,
} from '@/features/dashboard/api/NotificationCenter.api';
import {
  NotificationsListParams,
  ReadAllPayload,
  UpdateAlertPolicyPayload,
  UpdateNotificationPreferencesPayload,
  VehicleDeadlineAlertsParams,
} from '@/features/dashboard/types';
import { useUser } from '@/features/dashboard/hooks/user.hooks';

// companyId wchodzi do query keys, żeby dane różnych workspace'ów
// (po POST /auth/switch-company) nigdy się nie mieszały w cache'u.
const useCompanyId = () => {
  const { data: user } = useUser();
  return user?.companyId ?? null;
};

// =========================================================================
// PODSUMOWANIE / BADGE
// GET /notification-center/summary
// =========================================================================
export const useNotificationCenterSummary = () => {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['notification-center', 'summary', companyId],
    queryFn: getNotificationCenterSummary,
    enabled: !!companyId,
    staleTime: 1000 * 30,
  });
};

// =========================================================================
// AKTUALNE ALERTY POJAZDÓW (cursor)
// GET /vehicle-deadline-alerts
// =========================================================================
export const useVehicleDeadlineAlerts = (params?: Omit<VehicleDeadlineAlertsParams, 'cursor'>) => {
  const companyId = useCompanyId();
  const hasVehicleIdKey = params ? 'vehicleId' in params : false;

  return useInfiniteQuery({
    queryKey: ['vehicle-deadline-alerts', companyId, params],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      getVehicleDeadlineAlerts({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // jeśli caller jawnie filtruje po vehicleId, poczekaj aż będzie dostępne
    // (np. currentCar?.id na starcie ładowania strony) zamiast pobierać
    // w międzyczasie alerty wszystkich pojazdów firmy
    enabled: !!companyId && (!hasVehicleIdKey || !!params?.vehicleId),
  });
};

// =========================================================================
// POLITYKA ALERTÓW
// GET /alert-policy
// =========================================================================
export const useAlertPolicy = () => {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['alert-policy', companyId],
    queryFn: getAlertPolicy,
    enabled: !!companyId,
  });
};

// PATCH /alert-policy (tylko OWNER, ADMIN)
export const useUpdateAlertPolicy = () => {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: (payload: UpdateAlertPolicyPayload) => updateAlertPolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-policy', companyId] });
    },
  });
};

// =========================================================================
// LISTA NOTIFICATIONS (cursor)
// GET /notifications
// =========================================================================
export const useNotifications = (params?: Omit<NotificationsListParams, 'cursor'>) => {
  const companyId = useCompanyId();

  return useInfiniteQuery({
    queryKey: ['notifications', companyId, params],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      getNotifications({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!companyId,
  });
};

// =========================================================================
// SZCZEGÓŁ NOTIFICATION
// GET /notifications/{id}
// =========================================================================
export const useNotification = (notificationId: string) => {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['notifications', companyId, 'detail', notificationId],
    queryFn: () => getNotification(notificationId),
    enabled: !!companyId && !!notificationId,
    retry: false,
  });
};

// =========================================================================
// OZNACZENIE JAKO PRZECZYTANE
// PATCH /notifications/{id}/read
// =========================================================================
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', companyId] });
      queryClient.invalidateQueries({ queryKey: ['notification-center', 'summary', companyId] });
    },
  });
};

// =========================================================================
// ARCHIWIZACJA
// PATCH /notifications/{id}/archive
// =========================================================================
export const useArchiveNotification = () => {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: (notificationId: string) => archiveNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', companyId] });
      queryClient.invalidateQueries({ queryKey: ['notification-center', 'summary', companyId] });
    },
  });
};

// =========================================================================
// OZNACZENIE WSZYSTKICH JAKO PRZECZYTANE
// POST /notifications/read-all
// =========================================================================
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const companyId = useCompanyId();

  return useMutation({
    mutationFn: (payload?: ReadAllPayload) => markAllNotificationsAsRead(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', companyId] });
      queryClient.invalidateQueries({ queryKey: ['notification-center', 'summary', companyId] });
    },
  });
};

// =========================================================================
// PREFERENCJE UŻYTKOWNIKA (globalne, nie per-workspace)
// GET /notification-preferences/me
// =========================================================================
export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ['notification-preferences', 'me'],
    queryFn: getNotificationPreferences,
  });
};

// PATCH /notification-preferences/me
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateNotificationPreferencesPayload) =>
      updateNotificationPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', 'me'] });
    },
  });
};
