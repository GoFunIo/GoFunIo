import { DriverFormData } from '../types/DriverTypes';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// get all users

export const getDrivers = async () => {
  const res = await fetch(`${API_URL}/drivers`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) return null;

  const text = await res.text();

  if (!text) return null;

  return JSON.parse(text);
};

// invite driver to your team

export const inviteDriver = async (form: DriverFormData) => {
  try {
    const res = await fetch(`${API_URL}/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: form.email,
        lastName: form.lastName,
        firstName: form.firstName,
        phone: form.phone,
        notes: form.notes,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw {
        status: res.status,
        message: data?.message ?? 'Request failed',
      };
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        status: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// change driver settings

export const changeDriver = async (form: DriverFormData) => {
  try {
    const res = await fetch(`${API_URL}/drivers/${form.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: form.email,
        lastName: form.lastName,
        firstName: form.firstName,
        phone: form.phone,
        notes: form.notes,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw {
        status: res.status,
        message: data?.message ?? 'Request failed',
      };
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        status: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};

// delete driver

export const deleteDriver = async (id: string) => {
  try {
    const res = await fetch(`${API_URL}/drivers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw {
        status: res.status,
        message: data?.message ?? 'Request failed',
      };
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        status: 0,
        message: 'Brak połączenia z internetem',
      };
    }

    throw error;
  }
};
