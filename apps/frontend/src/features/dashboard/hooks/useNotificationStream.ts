// SSE jest wyłącznie sygnałem zmiany (event: notification.changed, data: {}) —
// nie niesie danych biznesowych. Po jego otrzymaniu odświeżamy odpowiednie
// query keys; aktualne dane zawsze i tak pochodzą z HTTP.
// Montować JEDEN raz w root layoucie sekcji /dashboard (route.tsx),
// nie w pojedynczych komponentach — inaczej powstanie N równoległych połączeń.

import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useUser } from '@/features/dashboard/hooks/user.hooks';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const useNotificationStream = () => {
  const { data: user } = useUser();
  const companyId = user?.companyId ?? null;

  useEffect(() => {
    if (!companyId) return;

    const source = new EventSource(`${API_URL}/notifications/stream`, {
      withCredentials: true,
    });

    const handleChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['notification-center', 'summary', companyId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-deadline-alerts', companyId] });
    };

    source.addEventListener('notification.changed', handleChanged);

    source.onerror = () => {};

    return () => {
      source.removeEventListener('notification.changed', handleChanged);
      source.close();
    };
  }, [companyId]);
};
