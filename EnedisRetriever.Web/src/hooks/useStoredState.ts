import { useEffect, useState } from 'react';

function read<T>(key: string, fallback: T, revive: (stored: unknown, fallback: T) => T): T {
  try {
    const raw = localStorage.getItem(key);

    return raw === null ? fallback : revive(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

/**
 * useState persisted in localStorage. `revive` turns whatever was stored
 * (possibly an older shape) into a valid value.
 */
export function useStoredState<T>(
  key: string,
  fallback: T,
  revive: (stored: unknown, fallback: T) => T
) {
  const [value, setValue] = useState<T>(() => read(key, fallback, revive));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode, quota): the app works without it.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
