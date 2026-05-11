import type { Credentials } from '@openpeeps/common/types';
import type { CredentialsStore } from './types';

const STORAGE_KEY = 'auth_credentials';

const get = async (): Promise<Credentials | null> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as Credentials;
  } catch {
    return null;
  }
};

const set = async (credentials?: Credentials | null): Promise<void> => {
  if (credentials) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const clear = async (): Promise<void> => set();

export const credentialsStore: CredentialsStore = {
  get,
  set,
  clear,
};

export type { CredentialsStore } from './types';
export type { Credentials } from '@openpeeps/common/types';
