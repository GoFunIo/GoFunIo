import {
  ChangeEmailFormData,
  ChangePasswordFormData,
  PersonalDataFormData,
} from '../lib/formValidationRules';

const API_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Pobiera dane aktualnie zalogowanego użytkownika na podstawie sesji/ciasteczka.
 * Bezpiecznie zwraca `null` zamiast rzucać błędem, jeśli użytkownik nie jest zalogowany.
 */

export const getUser = async () => {
  const res = await fetch(`${API_URL}/auth/me`, {
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

// zmiana danych uzytkownika

export const changeUserSettings = async (form: PersonalDataFormData) => {
  try {
    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: form.address,
        postalCode: form.postalCode,
        city: form.city,
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

// zmiana hasla
export const changeUserPassword = async (form: ChangePasswordFormData) => {
  try {
    const res = await fetch(`${API_URL}/users/me/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
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

// zmiana adresu email
export const changeUserEmail = async (form: ChangeEmailFormData) => {
  try {
    const res = await fetch(`${API_URL}/users/me/email`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: form.newEmail,
        currentPassword: form.currentPassword,
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
