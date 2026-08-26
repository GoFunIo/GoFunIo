import { AddServiceFormData } from '../lib/formValidationRules';
import {
  CreateServiceData,
  PaginatedServices,
  ServiceData,
  ServiceListParams,
  SingleServiceData,
} from '../types/ServiceTypes';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// =========================================================================
// WSPÓLNY PAYLOAD
// =========================================================================

const buildServicePayload = (form: CreateServiceData) => ({
  vehicleId: form.vehicleId,
  serviceDate: form.serviceDate,
  type: form.serviceType,
  cost: form.cost,
  providerName: form.servicePlace,
  notes: form.notes || null,
});

// =========================================================================
// GET /services
// POBIERANIE LISTY USŁUG
// =========================================================================

export const getAllServices = async (params?: ServiceListParams) => {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set('page', String(params.page));
  }

  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  if (params?.type) {
    query.set('type', params.type);
  }

  const queryString = query.toString();

  const res = await fetch(`${API_URL}/services${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się pobrać listy usług.',
    };
  }

  return data as PaginatedServices;
};

// =========================================================================
// POST /services
// TWORZENIE USŁUGI
// =========================================================================

export const createService = async (form: CreateServiceData) => {
  const payload = buildServicePayload(form);

  const res = await fetch(`${API_URL}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się dodać wpisu serwisowego.',
    };
  }

  return data as ServiceData;
};

// =========================================================================
// GET /services/{id}
// POBIERANIE POJEDYNCZEJ USŁUGI
// =========================================================================

export const getService = async (id: string) => {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się pobrać wpisu serwisowego.',
    };
  }

  return data as SingleServiceData;
};

// =========================================================================
// PATCH /services/{id}
// AKTUALIZACJA USŁUGI
// =========================================================================

export const updateService = async (id: string, form: AddServiceFormData) => {
  const payload = buildServicePayload(form);

  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się zaktualizować wpisu serwisowego.',
    };
  }

  return data as ServiceData;
};

// =========================================================================
// DELETE /services/{id}
// USUWANIE USŁUGI
// =========================================================================

export const deleteService = async (id: string) => {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    throw {
      status: res.status,
      message: data?.message ?? 'Nie udało się usunąć wpisu serwisowego.',
    };
  }
};
