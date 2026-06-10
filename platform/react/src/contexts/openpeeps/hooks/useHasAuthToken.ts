import { useEffect, useState } from 'react';
import {
  AUTH_CREDENTIALS_STORAGE_KEY,
  OPENPEEPS_CREDENTIALS_CHANGED_EVENT,
} from '../../../auth/credentials';
import { useCredentialsStore } from '../../credentialsStore';

function readTokenPresent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(AUTH_CREDENTIALS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { token?: string };
    return !!parsed?.token;
  } catch {
    return false;
  }
}

/** True when credentials storage contains a bearer token (sync read + store listener). */
export function useHasAuthToken(): boolean {
  const { credentialsStore } = useCredentialsStore();
  const [hasToken, setHasToken] = useState(readTokenPresent);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const next = !!(await credentialsStore.get())?.token;
      if (!cancelled) setHasToken(next);
    };

    void refresh();

    const onCred = () => void refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_CREDENTIALS_STORAGE_KEY || e.key === null)
        void refresh();
    };
    window.addEventListener(OPENPEEPS_CREDENTIALS_CHANGED_EVENT, onCred);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(OPENPEEPS_CREDENTIALS_CHANGED_EVENT, onCred);
      window.removeEventListener('storage', onStorage);
    };
  }, [credentialsStore]);

  return hasToken;
}
