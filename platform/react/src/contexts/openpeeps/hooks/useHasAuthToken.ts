import { useEffect, useState } from 'react';
import {
  AUTH_CREDENTIALS_STORAGE_KEY,
  subscribeCredentialsChanged,
} from '../../../auth/credentials';
import { useCredentialsStore } from '../../credentialsStore';

/** True when credentials storage contains a bearer token (sync read + store listener). */
export function useHasAuthToken(): boolean {
  const { credentialsStore } = useCredentialsStore();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const next = !!(await credentialsStore.get())?.token;
      if (!cancelled) setHasToken(next);
    };

    void refresh();

    const unsubCredentials = subscribeCredentialsChanged(() => void refresh());

    const hasWindow =
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function';

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_CREDENTIALS_STORAGE_KEY || e.key === null)
        void refresh();
    };

    if (hasWindow) {
      window.addEventListener('storage', onStorage);
    }

    return () => {
      cancelled = true;
      unsubCredentials();
      if (hasWindow) {
        window.removeEventListener('storage', onStorage);
      }
    };
  }, [credentialsStore]);

  return hasToken;
}
