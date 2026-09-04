import { AttachmentData } from '../types/AttachmentTypes';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const getServiceAttachments = async (id: string) => {
  const res = await fetch(`${API_URL}/services/${id}/attachments`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) return null;

  const text = await res.text();

  if (!text) return;

  return JSON.parse(text) as AttachmentData;
};

export const createServiceAttachment = async (id: string, file: File) => {
  try {
    const body = new FormData();
    body.append('attachment', file);

    const res = await fetch(`${API_URL}/services/${id}/attachments`, {
      method: 'POST',
      credentials: 'include',
      body,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw data;
    }

    return data;
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

export const updateServiceAttachment = async (
  serviceId: string,
  attachmentId: string,
  file: File,
) => {
  try {
    const body = new FormData();
    body.append('attachment', file);

    const response = await fetch(`${API_URL}/services/${serviceId}/attachments/${attachmentId}`, {
      method: 'PUT',
      credentials: 'include',
      body,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw data;
    }

    return data;
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
export const deleteServiceAttachment = async (serviceId: string, attachmentId: string) => {
  try {
    const response = await fetch(`${API_URL}/services/${serviceId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw data;
    }

    return data;
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
