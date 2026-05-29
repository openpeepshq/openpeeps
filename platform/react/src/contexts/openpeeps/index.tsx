import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OpenpeepsContextValue } from './types';
import {
  openpeepsClient,
  type OpenpeepsClientOptions,
} from '@openpeeps/client';
import type { CredentialsStore } from '../../auth/credentials/types';
import {
  AUTH_CREDENTIALS_STORAGE_KEY,
  OPENPEEPS_CREDENTIALS_CHANGED_EVENT,
} from '../../auth/credentials';
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
  const openpeepsClientOptionsProvider =
    useCallback(async (): Promise<OpenpeepsClientOptions> => {
      return {
        token: (await credentialsStore.get())?.token,
        baseUrl,
      };
    }, [credentialsStore, baseUrl]);

  const client = useMemo(
    () => openpeepsClient(openpeepsClientOptionsProvider),
    [openpeepsClientOptionsProvider],
  );

  const queryClient = useMemo(() => new QueryClient(), []);
  const [currentProfile, setCurrentProfile] = useState<
    ProfileWithMeta | undefined
  >(undefined);
  const [currentAccount, setCurrentAccount] = useState<
    PublicAccount | undefined
  >(undefined);

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
      const cred = await credentialsStore.get();
      if (!cred?.token) {
        setCurrentProfile(undefined);
        return;
      }
      const res = await client.profiles.current.read();
      const profile = 'data' in res ? res.data : undefined;
      setCurrentProfile(profile);
    };

    void fetchProfile();

    const onCredentialsChanged = () => void fetchProfile();
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_CREDENTIALS_STORAGE_KEY) void fetchProfile();
    };

    const hasWindow =
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function';

    if (hasWindow) {
      window.addEventListener(
        OPENPEEPS_CREDENTIALS_CHANGED_EVENT,
        onCredentialsChanged,
      );
      window.addEventListener('storage', onStorage);
    }

    return () => {
      if (hasWindow) {
        window.removeEventListener(
          OPENPEEPS_CREDENTIALS_CHANGED_EVENT,
          onCredentialsChanged,
        );
        window.removeEventListener('storage', onStorage);
      }
    };
  }, [credentialsStore, client]);

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
    const id = setInterval(() => void refreshIfExpiringSoon(), 60_000);
    const cleanups: Array<() => void> = [() => clearInterval(id)];

    if (
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function'
    ) {
      const onVis = () => {
        if (document.visibilityState === 'visible') {
          void refreshIfExpiringSoon();
        }
      };
      document.addEventListener('visibilitychange', onVis);
      cleanups.push(() =>
        document.removeEventListener('visibilitychange', onVis),
      );
    } else {
      try {
        // React Native — refresh when the app returns to the foreground.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AppState } =
          require('react-native') as typeof import('react-native');
        const subscription = AppState.addEventListener(
          'change',
          (state: string) => {
            if (state === 'active') void refreshIfExpiringSoon();
          },
        );
        cleanups.push(() => subscription.remove());
      } catch {
        /* not React Native */
      }
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [client, credentialsStore, queryClient]);

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
