import { CompanyDataFormData } from '../lib/formValidationRules';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const getCompany = async () => {
  const res = await fetch(`${API_URL}/company`, {
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

export const changeCompanyInfo = async (form: CompanyDataFormData) => {
  try {
    const res = await fetch(`${API_URL}/company`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        taxId: form.nip,
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
