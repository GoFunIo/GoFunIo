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

// POST /vehicles

export const createVehicle = async (form: AddVehicleFormData) => {
  try {
    const payload = buildVehiclePayload(form);

    const res = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data as VehicleData;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// AKTUALIZACJA POJAZDU  PATCH /vehicles/{id}
export const updateVehicle = async (id: string, form: AddVehicleFormData) => {
  try {
    const payload = buildVehiclePayload(form);

    const res = await fetch(`${API_URL}/vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data as VehicleData;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

//   DELETE /vehicles/{id}
export const deleteVehicle = async (id: string) => {
  try {
    const res = await fetch(`${API_URL}/vehicles/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw data;
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

//   GET /vehicles
export const getAllVehicles = async (params?: VehicleListParams) => {
  try {
    const query = new URLSearchParams();

    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.managerId) query.set('managerId', params.managerId);
    if (params?.search) query.set('search', params.search);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params?.expiryType) query.set('expiryType', params.expiryType);
    if (params?.expiresWithinDays) {
      query.set('expiresWithinDays', String(params.expiresWithinDays));
    }

    const queryString = query.toString();

    const res = await fetch(`${API_URL}/vehicles${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data as VehicleListResponse;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

//   GET /vehicles/{id}
export const getVehicle = async (id: string) => {
  try {
    const res = await fetch(`${API_URL}/vehicles/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data as VehicleData;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// PRZYPISANIE MANAGERA DO SAMOCHODU  POST /vehicles/{id}/managers
export const assignManagerToVehicle = async (vehicleId: string, managerId: string) => {
  try {
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
      throw data;
    }

    return data as VehicleData;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// DELETE /vehicles/{id}/managers/{managerId}
export const removeManagerFromVehicle = async (vehicleId: string, managerId: string) => {
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/managers/${managerId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw data;
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// GET /vehicles/{id}/manager-assignments
export const getVehicleManagerAssignments = async (vehicleId: string) => {
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/manager-assignments`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data as VehicleManagerAssignment[];
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// POST /vehicles/{vehicleId}/drivers
export const addDriverToVehicle = async (vehicleId: string, driverId: string) => {
  try {
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
      throw data;
    }

    return data as VehicleDriverAssignment;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// DELETE /vehicles/{vehicleId}/drivers/{driverId}
export const removeDriverFromVehicle = async (vehicleId: string, driverId: string) => {
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/drivers/${driverId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw data;
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// GET /vehicles/{vehicleId}/driver-assignments
export const getVehicleDriverAssignments = async (vehicleId: string) => {
  try {
    const res = await fetch(`${API_URL}/vehicles/${vehicleId}/driver-assignments`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data as VehicleDriverAssignment[];
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};
