import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVehicle,
  getAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  VehicleListParams,
  PaginatedVehicles,
  updateVehicleManagers,
  removeDriverFromVehicle,
  addDriverToVehicle,
} from '@/features/dashboard/api/vehicles.api';
import { VehicleData } from '@/features/dashboard/types';
import { AddVehicleFormData } from '@/features/dashboard/lib/formValidationRules';

// =========================================================================
// POBIERANIE POJEDYNCZEGO POJAZDU
// =========================================================================
export const useVehicle = (id: string) => {
  return useQuery<VehicleData>({
    queryKey: ['vehicles', id],
    queryFn: () => getVehicle(id),
    enabled: !!id,
    retry: false,
  });
};

// =========================================================================
// POBIERANIE LISTY POJAZDÓW (paginacja/filtrowanie/sortowanie)
// =========================================================================
export const useVehicles = (params?: VehicleListParams) => {
  return useQuery<PaginatedVehicles>({
    queryKey: ['vehicles', 'list', params],
    queryFn: () => getAllVehicles(params),
    staleTime: 1000 * 60 * 5,
  });
};

// =========================================================================
// TWORZENIE POJAZDU
// =========================================================================
export const useCreateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (form: AddVehicleFormData) => createVehicle(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

// =========================================================================
// AKTUALIZACJA POJAZDU
// =========================================================================
export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: AddVehicleFormData }) => updateVehicle(id, form),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['vehicles'] }),
        queryClient.refetchQueries({ queryKey: ['vehicles', variables.id] }),
      ]);
    },
  });
};

// =========================================================================
// USUWANIE POJAZDU
// =========================================================================
export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

// =========================================================================
// PRZYPISANIE POJAZDÓW DO MANAGERA
// =========================================================================

export const useUpdateVehicleManagers = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (managerIds: string[]) => updateVehicleManagers(vehicleId, managerIds),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

// =========================================================================
// PRZYPISANIE KIEROWCY  DO MANAGERA
// =========================================================================

export const useAddDriverToVehicle = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driverId: string) => addDriverToVehicle(vehicleId, driverId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

// =========================================================================
// USUNIĘCIE  KIEROWCY  DO MANAGERA
// =========================================================================

export const useRemoveDriverFromVehicle = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driverId: string) => removeDriverFromVehicle(vehicleId, driverId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};
