import { LoginFormData, SignupFormData } from './types/FormTypes';

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

  const text = await res.text();

  if (!text) return null;

  return JSON.parse(text);
};

/**
 * Rejestruje nowe konto użytkownika w aplikacji
 */
export const signUp = async (form: SignupFormData) => {
  const { email, password } = form;

  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Request failed',
    };
  }

  return data;
};

/**
 * Wylogowuje użytkownika poprzez usunięcie sesji/ciasteczek po stronie backendu.
 * @throws {Error} Standardowy błąd w przypadku problemów z komunikacją z serwerem.
 */
export const signOut = async () => {
  const res = await fetch(`${API_URL}/auth/signout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to sign out');
  }
};

/**
 * Loguje użytkownika do aplikacji (tworzy sesję).
 */
export const signIn = async (form: LoginFormData) => {
  const { email, password } = form;

  const res = await fetch(`${API_URL}/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Request failed',
    };
  }

  return data;
};

/**
 * Zgłasza prośbę o ponowne wygenerowanie i wysłanie linku weryfikacyjnego na podany e-mail.
 */

export const resendVerification = async (email: string) => {
  const res = await fetch(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw await res.json();
  }
  return res.json();
};

/**
 * Weryfikuje adres email użytkownika przy użyciu tokena otrzymanego w linku.
 * Rzuca błąd z komunikatem, jeśli weryfikacja nie powiodła się.
 */
export const verifyEmail = async (token: string) => {
  const cleanToken = token.trim();

  const res = await fetch(`${API_URL}/auth/verify-email?token=${cleanToken}`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Weryfikacja nie powiodła się',
    };
  }

  return data;
};
