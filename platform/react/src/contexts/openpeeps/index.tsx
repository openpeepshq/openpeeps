import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OpenpeepsContextValue } from './types';
import { openpeepsClient, type OpenpeepsClientOptions } from '@openpeeps/client';
import type { CredentialsStore } from '../../auth/credentials/types';
import { buildOpenpeepsApi } from './hooks';
import { CredentialsStoreProvider } from '../credentialsStore';
import type { ProfileWithMeta, PublicAccount } from '@openpeeps/common';

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
    (profile) => { if (profile?.id !== currentProfile?.id) { setCurrentProfile(profile) } },
    (account) => { if (account?.id !== currentAccount?.id) { setCurrentAccount(account) } }
  );

  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await client.profiles.current.read().then((res) => 'data' in res ? res.data : undefined);
      setCurrentProfile(profile);
    };
    fetchProfile();
  }, []);

  return (
    <OpenpeepsContext.Provider
      value={{ openpeepsApi, currentProfile, currentAccount, queryClient }}
    >
      <QueryClientProvider client={queryClient}>
        <CredentialsStoreProvider credentialsStore={credentialsStore}>
          {children}
        </CredentialsStoreProvider>
      </QueryClientProvider>
    </OpenpeepsContext.Provider>
  );
};
