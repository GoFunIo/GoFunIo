import { useMemo } from 'react';
import { useVehicleDeadlineAlerts } from '@/features/dashboard/hooks/notificationCenter.hooks';
import {
  DeadlineKind,
  VehicleDeadlineAlert,
  VehicleDeadlineAlertsParams,
} from '@/features/dashboard/types';

// =========================================================================
// spłaszcza strony infinite query do jednej listy — limit domyślny 20
// =========================================================================
export const useAllVehicleAlerts = (params?: Omit<VehicleDeadlineAlertsParams, 'cursor'>) => {
  const query = useVehicleDeadlineAlerts(params);

  const items = useMemo<VehicleDeadlineAlert[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return { ...query, items };
};

// =========================================================================
// Map<vehicleId, VehicleDeadlineAlert[]> — do grida "Moje pojazdy" i
// statystyk na dashboardzie głównym, żeby nie robić N+1 requestów per karta.
// =========================================================================
export const useVehicleAlertsByVehicle = (
  params?: Omit<VehicleDeadlineAlertsParams, 'cursor' | 'vehicleId'>,
) => {
  const { items, ...rest } = useAllVehicleAlerts(params);

  const byVehicle = useMemo(() => {
    const map = new Map<string, VehicleDeadlineAlert[]>();
    items.forEach((alert) => {
      const existing = map.get(alert.vehicleId) ?? [];
      existing.push(alert);
      map.set(alert.vehicleId, existing);
    });
    return map;
  }, [items]);

  return { byVehicle, items, ...rest };
};

// =========================================================================
// Alerty jednego pojazdu, zgrupowane po rodzaju terminu — do strony
// /dashboard/my-cars/$carId (3 kafelki: przegląd / OC / AC).
// =========================================================================
export const useVehicleAlertsForCar = (vehicleId?: string) => {
  const { items, ...rest } = useAllVehicleAlerts(vehicleId ? { vehicleId } : undefined);

  const byKind = useMemo(() => {
    const map = new Map<DeadlineKind, VehicleDeadlineAlert>();
    items.forEach((alert) => map.set(alert.deadlineKind, alert));
    return map;
  }, [items]);

  return { byKind, items, ...rest };
};
