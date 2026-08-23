import { TeamMember, UserFormData } from '../types/UserTypes';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// get all users

export const getTeam = async () => {
  const res = await fetch(`${API_URL}/users`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) return null;

  const text = await res.text();

  if (!text) return;

  return JSON.parse(text) as TeamMember[];
};

// invite user to your team

export const inviteTeamMember = async (form: UserFormData) => {
  console.log(form);
  try {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: form.email,
        lastName: form.lastName,
        firstName: form.firstName,
        role: form.role,
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

// edit team member settings

export const changeTeamMember = async (form: UserFormData) => {
  try {
    const res = await fetch(`${API_URL}/users/${form.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        lastName: form.lastName,
        firstName: form.firstName,
        role: form.role,
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

// delete team member

export const deleteTeamMember = async (id: string) => {
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
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
