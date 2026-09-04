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

  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
  if (params?.type) query.set('type', params.type);
  if (params?.providerName) query.set('providerName', params.providerName);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);

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
  try {
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
      throw data;
    }

    return data as ServiceData;
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

export const updateService = async (id: string, form: CreateServiceData) => {
  try {
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
      throw data;
    }

    return data as ServiceData;
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

// =========================================================================
// DELETE /services/{id}
// USUWANIE USŁUGI
// =========================================================================

export const deleteService = async (id: string) => {
  try {
    const res = await fetch(`${API_URL}/services/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
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
