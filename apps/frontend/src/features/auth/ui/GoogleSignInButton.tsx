import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { signInWithGoogle } from '../auth.api';
import { FormError } from './FormError';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_ID = 'google-identity-services';
let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof google !== 'undefined') {
    return Promise.resolve();
  }
  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        script.remove();
        reject(new Error('Google script failed to load'));
      },
      { once: true },
    );

    if (!existing) {
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    googleScriptPromise = null;
    throw error;
  });

  googleScriptPromise = promise;
  return promise;
}

export const GoogleSignInButton = () => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) {
      return;
    }

    let cancelled = false;

    void loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current) {
          return;
        }

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setError('');
            try {
              const user = await signInWithGoogle(response.credential);
              queryClient.setQueryData(['me'], user);
              navigate({ to: '/dashboard' });
            } catch (err) {
              const apiError = err as { message?: string };
              setError(apiError.message ?? 'Logowanie przez Google nie powiodło się');
            }
          },
        });

        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: Math.min(buttonRef.current.offsetWidth || 400, 400),
          text: 'signin_with',
          locale: 'pl',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError('Nie udało się załadować logowania Google');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="mt-[30px]">
      {error && <FormError message={error} />}
      <div ref={buttonRef} className="flex w-full justify-center" />
    </div>
  );
};
