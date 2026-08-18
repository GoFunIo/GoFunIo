import { AddVehicleFormData } from '../lib/formValidationRules';
import {
  VehicleData,
  VehicleDriverAssignment,
  VehicleListResponse,
  VehicleManagerAssignment,
} from '@/features/dashboard/types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type VehicleListParams = {
  page?: number;
  pageSize?: number;
  managerId?: string;
  search?: string;
  sortBy?:
    | 'createdAt'
    | 'brand'
    | 'model'
    | 'productionYear'
    | 'currentMileage'
    | 'ocExpiry'
    | 'acExpiry'
    | 'technicalInspectionExpiry';
  sortOrder?: 'asc' | 'desc';
  expiryType?: 'oc' | 'ac' | 'inspection';
  expiresWithinDays?: number;
};

// =========================================================================
// WSPÓLNY PAYLOAD
// =========================================================================
const buildVehiclePayload = (form: AddVehicleFormData) => ({
  brand: form.brand,
  model: form.model,
  registrationNumber: form.registrationNumber,
  productionYear: form.productionYear ? Number(form.productionYear) : null,
  currentMileage: form.currentMileage ?? null,
  fuelType: form.fuelType || null,
  vin: form.vin || null,
  purchaseDate: form.purchaseDate || null,
  ocExpiry: form.ocExpiry || null,
  acExpiry: form.acExpiry || null,
  technicalInspectionExpiry: form.technicalInspectionExpiry || null,
  notes: form.notes || null,
});

// =========================================================================
// TWORZENIE POJAZDU  POST /vehicles
// =========================================================================
export const createVehicle = async (form: AddVehicleFormData) => {
  const payload = buildVehiclePayload(form);

  const res = await fetch(`${API_URL}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się dodać pojazdu.',
    };
  }

  return data as VehicleData;
};

// =========================================================================
// AKTUALIZACJA POJAZDU  PATCH /vehicles/{id}
// =========================================================================
export const updateVehicle = async (id: string, form: AddVehicleFormData) => {
  const payload = buildVehiclePayload(form);

  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się zaktualizować pojazdu.',
    };
  }

  return data as VehicleData;
};

// =========================================================================
// USUWANIE POJAZDU  DELETE /vehicles/{id}
// =========================================================================
export const deleteVehicle = async (id: string) => {
  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się usunąć pojazdu.',
    };
  }
};

// =========================================================================
// POBIERANIE WSZYSTKICH POJAZDÓW   GET /vehicles
// =========================================================================
export const getAllVehicles = async (params?: VehicleListParams) => {
  const query = new URLSearchParams();

  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.managerId) query.set('managerId', params.managerId);
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.expiryType) query.set('expiryType', params.expiryType);
  if (params?.expiresWithinDays) query.set('expiresWithinDays', String(params.expiresWithinDays));

  const queryString = query.toString();

  const res = await fetch(`${API_URL}/vehicles${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się pobrać listy pojazdów.',
    };
  }

  return data as VehicleListResponse;
};

// =========================================================================
// POBIERANIE POJEDYNCZEGO POJAZDU   GET /vehicles/{id}
// =========================================================================
export const getVehicle = async (id: string) => {
  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się pobrać danych pojazdu.',
    };
  }

  return data as VehicleData;
};

// =========================================================================
// PRZYPISANIE MANAGERA DO SAMOCHODU  POST /vehicles/{id}/managers
// =========================================================================
export const assignManagerToVehicle = async (vehicleId: string, managerId: string) => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/managers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      managerId,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się przypisać managera.',
    };
  }

  return data as VehicleData;
};

// =========================================================================
// USUNIĘCIE MANAGERA Z POJAZDU
// DELETE /vehicles/{id}/managers/{managerId}
// =========================================================================

export const removeManagerFromVehicle = async (vehicleId: string, managerId: string) => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/managers/${managerId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się usunąć managera.',
    };
  }
};

// =========================================================================
// HISTORIA PRZYPISAŃ MANAGERÓW
// GET /vehicles/{id}/manager-assignments
// =========================================================================

export const getVehicleManagerAssignments = async (vehicleId: string) => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/manager-assignments`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się pobrać historii przypisań managerów.',
    };
  }

  return data as VehicleManagerAssignment[];
};

// =========================================================================
// PRZYPISANIE KIEROWCY DO SAMOCHODU
// POST /vehicles/{vehicleId}/drivers
// =========================================================================
export const addDriverToVehicle = async (vehicleId: string, driverId: string) => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/drivers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ driverId }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się przypisać kierowcy.',
    };
  }

  return data as VehicleDriverAssignment;
};

// =========================================================================
// USUNIĘCIE  KIEROWCY Z  SAMOCHODU
// DELETE /vehicles/{vehicleId}/drivers/{driverId}
// =========================================================================
export const removeDriverFromVehicle = async (vehicleId: string, driverId: string) => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/drivers/${driverId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się usunąć kierowcy.',
    };
  }
};

// =========================================================================
// HISTORIA PRZYPISAŃ KIEROWCÓW DO POJAZDU
// GET /vehicles/{vehicleId}/driver-assignments
// =========================================================================

export const getVehicleDriverAssignments = async (vehicleId: string) => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/driver-assignments`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się pobrać historii przypisań kierowców.',
    };
  }

  return data as VehicleDriverAssignment;
};
