import { ChangePasswordFormData, PersonalDataFormData } from '../lib/formValidationRules';

const API_URL = import.meta.env.VITE_API_URL ?? '';

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
