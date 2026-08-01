import { AddVehicleFormData } from '../lib/formValidationRules';
import { VehicleData } from '@/features/dashboard/types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type VehicleListParams = {
  page?: number;
  pageSize?: number;
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

export type PaginatedVehicles = {
  items: VehicleData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// export type ManagerAssignment = {
//   id: string;
//   managerId: string;
//   vehicleId: string;
//   assignedFrom: string;
//   assignedTo: string | null;
//   createdAt: string;
// };

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
// TWORZENIE POJAZDU
// =========================================================================
export const createVehicle = async (form: AddVehicleFormData): Promise<VehicleData> => {
  const payload = buildVehiclePayload(form);

  const res = await fetch(`${API_URL}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw { status: res.status, message: data?.message ?? 'Nie udało się dodać pojazdu.' };
  }

  return data;
};

// =========================================================================
// AKTUALIZACJA POJAZDU
// =========================================================================
export const updateVehicle = async (id: string, form: AddVehicleFormData): Promise<VehicleData> => {
  const payload = buildVehiclePayload(form);

  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw { status: res.status, message: data?.message ?? 'Nie udało się zaktualizować pojazdu.' };
  }

  return data;
};

// =========================================================================
// USUWANIE POJAZDU
// =========================================================================
export const deleteVehicle = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw { status: res.status, message: data?.message ?? 'Nie udało się usunąć pojazdu.' };
  }
};

// =========================================================================
// POBIERANIE WSZYSTKICH POJAZDÓW
// =========================================================================
export const getAllVehicles = async (params?: VehicleListParams): Promise<PaginatedVehicles> => {
  const query = new URLSearchParams();

  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
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
    throw { status: res.status, message: data?.message ?? 'Nie udało się pobrać listy pojazdów.' };
  }

  return data;
};

// =========================================================================
// POBIERANIE POJEDYNCZEGO POJAZDU
// =========================================================================
export const getVehicle = async (id: string): Promise<VehicleData> => {
  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw { status: res.status, message: data?.message ?? 'Nie udało się pobrać danych pojazdu.' };
  }

  return data;
};

// =========================================================================
// PRZYPISANIE MANAGERA DO SAMOCHODU
// =========================================================================
export const updateVehicleManagers = async (
  vehicleId: string,
  managerIds: string[],
): Promise<VehicleData> => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ managerIds }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się zaktualizować managerów.',
    };
  }

  return data;
};

// =========================================================================
// PRZYPISANIE KIEROWCY DO SAMOCHODU
// =========================================================================
export const addDriverToVehicle = async (vehicleId: string, driverId: string): Promise<void> => {
  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/drivers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ driverId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się przypisać kierowcy.',
    };
  }
};

// =========================================================================
// USUNIĘCIE  KIEROWCY Z  SAMOCHODU
// =========================================================================
export const removeDriverFromVehicle = async (
  vehicleId: string,
  driverId: string,
): Promise<void> => {
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
