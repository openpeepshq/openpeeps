import type { Credentials } from '@openpeeps/common/types';
import type { CredentialsStore } from './types';

/** localStorage key — exported for `storage` listeners in other modules. */
export const AUTH_CREDENTIALS_STORAGE_KEY = 'auth_credentials';

/** Fired on the window after any successful `set` / `clear` on the store. */
export const OPENPEEPS_CREDENTIALS_CHANGED_EVENT =
  'openpeeps-credentials-changed';

const credentialsChangedListeners = new Set<() => void>();

/** Cross-platform credential change subscription (required on React Native). */
export const subscribeCredentialsChanged = (listener: () => void) => {
  credentialsChangedListeners.add(listener);
  return () => {
    credentialsChangedListeners.delete(listener);
  };
};

export const notifyCredentialsChanged = () => {
  credentialsChangedListeners.forEach((listener) => listener());
  if (typeof window === 'undefined') return;
  // Defer so callers finish mutating localStorage before listeners run (avoids
  // synchronous re-entrancy and duplicate work during the same task).
  queueMicrotask(() => {
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event(OPENPEEPS_CREDENTIALS_CHANGED_EVENT));
    }
  });
};

const get = async (): Promise<Credentials | null> => {
  const stored = localStorage.getItem(AUTH_CREDENTIALS_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as Credentials;
  } catch {
    return null;
  }
};

const set = async (credentials?: Credentials | null): Promise<void> => {
  const prevRaw = localStorage.getItem(AUTH_CREDENTIALS_STORAGE_KEY);
  const nextRaw = credentials ? JSON.stringify(credentials) : null;

  // Avoid redundant writes + credential-changed storms (e.g. clear when empty,
  // or set with identical JSON), which could retrigger profile fetches and
  // interact badly with auth routes.
  if (prevRaw === nextRaw) return;

  if (credentials) {
    localStorage.setItem(AUTH_CREDENTIALS_STORAGE_KEY, nextRaw!);
  } else {
    localStorage.removeItem(AUTH_CREDENTIALS_STORAGE_KEY);
  }
  notifyCredentialsChanged();
};

const clear = async (): Promise<void> => set();

export const credentialsStore: CredentialsStore = {
  get,
  set,
  clear,
};

export type { CredentialsStore } from './types';
export type { Credentials } from '@openpeeps/common/types';
