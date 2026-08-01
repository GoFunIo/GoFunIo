import { useState } from 'react';

export function useError() {
  const [error, setError] = useState<string | null>(null);

  return {
    error,
    setError,
  };
}
