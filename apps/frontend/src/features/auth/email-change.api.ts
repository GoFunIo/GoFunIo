const API_URL = import.meta.env.VITE_API_URL ?? '';

export async function verifyEmailChange(token: string) {
  const response = await fetch(`${API_URL}/auth/verify-email-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token: token.trim() }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.message ?? 'Zmiana adresu e-mail nie powiodła się',
    };
  }
  return data;
}
