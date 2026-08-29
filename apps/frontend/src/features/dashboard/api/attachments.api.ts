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
  const body = new FormData();
  body.append('attachment', file);

  const response = await fetch(`${API_URL}/services/${id}/attachments`, {
    method: 'POST',
    credentials: 'include',
    body,
  });

  if (!response.ok) {
    throw new Error('Nie udało się dodać załącznika');
  }

  return response.json();
};

export const updateServiceAttachment = async (
  serviceId: string,
  attachmentId: string,
  file: File,
) => {
  const body = new FormData();
  body.append('attachment', file);

  const response = await fetch(`${API_URL}/services/${serviceId}/attachments/${attachmentId}`, {
    method: 'PUT',
    credentials: 'include',
    body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.message ?? 'Nie udało się zastąpić załącznika.',
    };
  }

  return data;
};

export const deleteServiceAttachment = async (serviceId: string, attachmentId: string) => {
  const response = await fetch(`${API_URL}/services/${serviceId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.message ?? 'Nie udało się usunąć załącznika.',
    };
  }

  return data;
};
