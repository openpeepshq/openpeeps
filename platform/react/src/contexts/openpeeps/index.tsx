import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OpenpeepsContextValue } from './types';
import {
  openpeepsClient,
  type OpenpeepsClientOptions,
} from '@openpeeps/client';
import type { CredentialsStore } from '../../auth/credentials/types';
import { buildOpenpeepsApi } from './hooks';
import { CredentialsStoreProvider } from '../credentialsStore';
import {
  jwtHasRemainingValidityAtLeast,
  type ProfileWithMeta,
  type PublicAccount,
} from '@openpeeps/common';

const OpenpeepsContext = createContext<OpenpeepsContextValue | null>(null);

export const useOpenpeeps = () => {
  const context = useContext(OpenpeepsContext);
  if (!context) {
    throw new Error('useOpenpeeps must be used within an OpenpeepsProvider');
  }
  return context;
};

export const OpenpeepsProvider: React.FC<{
  children: React.ReactNode;
  credentialsStore: CredentialsStore;
  baseUrl: string;
  debug?: boolean;
}> = ({ children, credentialsStore, baseUrl }) => {
  const openpeepsClientOptionsProvider: () => Promise<OpenpeepsClientOptions> =
    async () => ({
      token: (await credentialsStore.get())?.token,
      baseUrl,
    });
  const queryClient = new QueryClient();
  const [currentProfile, setCurrentProfile] = useState<
    ProfileWithMeta | undefined
  >(undefined);
  const [currentAccount, setCurrentAccount] = useState<
    PublicAccount | undefined
  >(undefined);

  const client = openpeepsClient(openpeepsClientOptionsProvider);

  const openpeepsApi = buildOpenpeepsApi(
    client,
    (profile) => {
      if (profile?.id !== currentProfile?.id) {
        setCurrentProfile(profile);
      }
    },
    (account) => {
      if (account?.id !== currentAccount?.id) {
        setCurrentAccount(account);
      }
    },
  );

  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await client.profiles.current
        .read()
        .then((res) => ('data' in res ? res.data : undefined));
      setCurrentProfile(profile);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const refreshIfExpiringSoon = async () => {
      const token = (await credentialsStore.get())?.token;
      if (!token?.trim()) return;
      if (!jwtHasRemainingValidityAtLeast(token, 1)) return;
      if (jwtHasRemainingValidityAtLeast(token, 60 * 60)) return;
      const res = await client.auth.refresh({});
      if (!('data' in res)) return;
      await credentialsStore.set({ token: res.data.token });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'current'] });
      const profile = await client.profiles.current.read().then((r) =>
        'data' in r ? r.data : undefined,
      );
      setCurrentProfile(profile);
      const account = await client.accounts.current.read().then((r) =>
        'data' in r ? r.data : undefined,
      );
      setCurrentAccount(account);
    };

    void refreshIfExpiringSoon();
    const id = window.setInterval(() => void refreshIfExpiringSoon(), 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshIfExpiringSoon();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [client, credentialsStore, queryClient]);

  return (
    <OpenpeepsContext.Provider
      value={{
        openpeepsApi,
        client,
        currentProfile,
        currentAccount,
        queryClient,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <CredentialsStoreProvider credentialsStore={credentialsStore}>
          {children}
        </CredentialsStoreProvider>
      </QueryClientProvider>
    </OpenpeepsContext.Provider>
  );
};
