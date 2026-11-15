import {
  CreateDeadlineKindData,
  DeadlineKindType,
  RenameDeadlineKindData,
} from '../types/DeadlinesKindsTypes';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const getDeadlinesKinds = async (): Promise<DeadlineKindType[] | null> => {
  const res = await fetch(`${API_URL}/vehicle-deadline-kinds`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type');

  if (!contentType?.includes('application/json')) return null;

  const text = await res.text();

  if (!text) return [];

  return JSON.parse(text) as DeadlineKindType[];
};

export const createDeadlineKind = async (
  form: CreateDeadlineKindData,
): Promise<DeadlineKindType> => {
  try {
    const res = await fetch(`${API_URL}/vehicle-deadline-kinds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) throw data;

    return data as DeadlineKindType;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem.',
      };
    }

    throw error;
  }
};

export const renameDeadlineKind = async (
  id: string,
  form: RenameDeadlineKindData,
): Promise<DeadlineKindType> => {
  try {
    const res = await fetch(`${API_URL}/vehicle-deadline-kinds/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data as DeadlineKindType;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        statusCode: 0,
        message: 'Brak połączenia z internetem.',
      };
    }

    throw error;
  }
};

export const deleteDeadlineKind = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/vehicle-deadline-kinds/${id}`, {
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
        message: 'Brak połączenia z internetem.',
      };
    }

    throw error;
  }
};
