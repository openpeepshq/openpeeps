import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  AuthorizationData,
  ProfileSettings,
  ProfileWithMeta,
  PublicAccount,
  Scope,
} from '@openpeepshq/common';
import { parseScopesFromJwt } from '@openpeepshq/common';
import {
  AUTH_CREDENTIALS_STORAGE_KEY,
  OPENPEEPS_CREDENTIALS_CHANGED_EVENT,
} from '../../auth/credentials';
import { useCredentialsStore } from '../../contexts/credentialsStore';

export interface IdentityContextValue {
  profile?: ProfileWithMeta;
  account?: PublicAccount;
  profileSettings?: ProfileSettings;
}

export const IdentityContext = createContext<IdentityContextValue>({});

export const useIdentity = () => useContext(IdentityContext);
export const useCurrentProfile = () => useIdentity().profile;
export const useCurrentAccount = () => useIdentity().account;
export const useCurrentProfileSettings = () => useIdentity().profileSettings;

/** Profile + account from context and scopes from the stored JWT (mirrors Svelte `getCurrentAuthData`). */
export const useAuthData = (): AuthorizationData => {
  const { profile, account } = useIdentity();
  const { credentialsStore } = useCredentialsStore();
  const [scopes, setScopes] = useState<Scope[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const token = (await credentialsStore.get())?.token;
      const next = parseScopesFromJwt(token);
      if (!cancelled) setScopes(next);
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

  return useMemo(
    () => ({ profile, account, scopes }) as AuthorizationData,
    [profile, account, scopes],
  );
};
