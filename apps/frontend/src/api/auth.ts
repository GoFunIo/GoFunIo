export const getUser = async () => {
  const res = await fetch('/auth/me', {
    credentials: 'include',
  });

  if (!res.ok) return null;

  return res.json();
};

export const signUp = async (email: string, password: string) => {
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

export const signIn = async (email: string, password: string) => {
  const res = await fetch('/auth/signin', {
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
