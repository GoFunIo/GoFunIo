import { LoginFormData, SignupFormData } from './types/FormTypes';

const API_URL = import.meta.env.VITE_API_URL ?? '';

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

export const signInWithGoogle = async (credential: string) => {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ credential }),
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

export const acceptMembershipInvitation = async (token: string) => {
  const res = await fetch(`${API_URL}/auth/invitations/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw { status: res.status, message: data?.message ?? 'Request failed' };
  }
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

export const requestPasswordReset = async (email: string) => {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw { status: res.status, message: 'Request failed' };
  }
};

export const resetPassword = async (token: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token: token.trim(), password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message ?? 'Reset hasła nie powiódł się',
    };
  }
};
