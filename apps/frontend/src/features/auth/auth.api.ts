import { FormProps } from '@/features/auth/types/types';

export const getUser = async () => {
  const res = await fetch('/auth/me', {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) return null;

  const text = await res.text();

  if (!text) return null;

  return JSON.parse(text);
};

export const signUp = async (form: FormProps) => {
  const { email, password } = form;

  const res = await fetch('/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw await res.json();
  }

  return res.json();
};

export const signOut = async () => {
  const res = await fetch('/auth/signout', {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to sign out');
  }
};

export const signIn = async (form: FormProps) => {
  const res = await fetch('/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(form),
  });

  if (!res.ok) {
    throw await res.json();
  }

  return res.json();
};
