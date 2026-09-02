import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVehicle,
  getAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignManagerToVehicle,
  removeManagerFromVehicle,
  getVehicleManagerAssignments,
  addDriverToVehicle,
  removeDriverFromVehicle,
  getVehicleDriverAssignments,
  VehicleListParams,
} from '@/features/dashboard/api/vehicles.api';
import { AddVehicleFormData } from '@/features/dashboard/lib/formValidationRules';

// =========================================================================
// POBIERANIE POJEDYNCZEGO POJAZDU
// GET /vehicles/{id}
// =========================================================================
export const useVehicle = (id?: string | null) => {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => getVehicle(id!),
    enabled: !!id,
    retry: false,
  });
};

// =========================================================================
// POBIERANIE LISTY POJAZDÓW   Paginacja / filtrowanie / sortowanie
// GET /vehicles
// =========================================================================
export const useVehicles = (params?: VehicleListParams) => {
  return useQuery({
    queryKey: ['vehicles', 'list', params],
    queryFn: () => getAllVehicles(params),
    staleTime: 1000 * 60 * 5,
  });
};

// =========================================================================
// TWORZENIE POJAZDU
// POST /vehicles
// =========================================================================
export const useCreateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (form: AddVehicleFormData) => createVehicle(form),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['vehicles'],
      });
    },
  });
};

// =========================================================================
// AKTUALIZACJA POJAZDU
// PATCH /vehicles/{id}
// =========================================================================
export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: AddVehicleFormData }) => updateVehicle(id, form),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['vehicles'],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', variables.id],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicle-deadline-alerts'],
      });
    },
  });
};

// =========================================================================
// USUWANIE POJAZDU
// DELETE /vehicles/{id}
// =========================================================================
export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['vehicles'],
      });
    },
  });
};

// =========================================================================
// PRZYPISANIE MANAGERA DO POJAZDU
// POST /vehicles/{vehicleId}/managers
// =========================================================================

export const useAssignManagerToVehicle = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (managerId: string) => assignManagerToVehicle(vehicleId, managerId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['vehicles'],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'manager-assignments'],
      });
    },
  });
};

// =========================================================================
// USUNIĘCIE MANAGERA Z POJAZDU
// DELETE /vehicles/{vehicleId}/managers/{managerId}
// =========================================================================

export const useRemoveManagerFromVehicle = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (managerId: string) => removeManagerFromVehicle(vehicleId, managerId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['vehicles'],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'manager-assignments'],
      });
    },
  });
};

// =========================================================================
// HISTORIA PRZYPISAŃ MANAGERÓW
// GET /vehicles/{vehicleId}/manager-assignments
// =========================================================================

export const useVehicleManagerAssignments = (vehicleId: string) => {
  return useQuery({
    queryKey: ['vehicles', vehicleId, 'manager-assignments'],
    queryFn: () => getVehicleManagerAssignments(vehicleId),
    enabled: !!vehicleId,
  });
};

// =========================================================================
// PRZYPISANIE KIEROWCY DO POJAZDU
// POST /vehicles/{vehicleId}/drivers
// =========================================================================

export const useAddDriverToVehicle = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driverId: string) => addDriverToVehicle(vehicleId, driverId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['vehicles'],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'driver-assignments'],
      });
    },
  });
};

// =========================================================================
// USUNIĘCIE KIEROWCY Z POJAZDU
// DELETE /vehicles/{vehicleId}/drivers/{driverId}
// =========================================================================

export const useRemoveDriverFromVehicle = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driverId: string) => removeDriverFromVehicle(vehicleId, driverId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['vehicles'],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'driver-assignments'],
      });
    },
  });
};

// =========================================================================
// HISTORIA PRZYPISAŃ KIEROWCÓW
// GET /vehicles/{vehicleId}/driver-assignments
// =========================================================================

export const useVehicleDriverAssignments = (vehicleId: string) => {
  return useQuery({
    queryKey: ['vehicles', vehicleId, 'driver-assignments'],
    queryFn: () => getVehicleDriverAssignments(vehicleId),
    enabled: !!vehicleId,
  });
};
