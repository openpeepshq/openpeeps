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
} from '@openpeepshq/client';
import type { CredentialsStore } from '../../auth/credentials/types';
import {
  AUTH_CREDENTIALS_STORAGE_KEY,
  OPENPEEPS_CREDENTIALS_CHANGED_EVENT,
} from '../../auth/credentials';
import { buildOpenpeepsApi } from './hooks';
import { CredentialsStoreProvider } from '../credentialsStore';

export { useHasAuthToken } from './hooks/useHasAuthToken';
import {
  isServiceOnlyJwt,
  jwtHasRemainingValidityAtLeast,
  type ProfileWithMeta,
  type PublicAccount,
} from '@openpeepshq/common';

/** Refresh when less than this many seconds remain (login JWTs are 1w). */
const REFRESH_WHEN_REMAINING_BELOW_SEC = 24 * 60 * 60;

const isAuthFailure = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const { status, statusCode } = error as {
    status?: number;
    statusCode?: number;
  };
  const code = status ?? statusCode;
  return code === 401 || code === 403;
};

/** Web-only; RN relies on cleared profile for the auth/main switch. */
const redirectToLogin = () => {
  if (
    typeof window === 'undefined' ||
    typeof window.location?.href !== 'string'
  ) {
    return;
  }
  const { pathname, search } = window.location;
  if (pathname.startsWith('/auth')) return;
  window.location.href = `/auth/login?redirect=${encodeURIComponent(
    `${pathname}${search}`,
  )}`;
};

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
  /**
   * Optional subscription to "app returned to foreground" events. Used in
   * environments that lack `document.visibilitychange` (e.g. React Native).
   * Must return an unsubscribe function.
   *
   * React Native consumers should import `OpenpeepsProvider` from
   * `@openpeepshq/react-native`, which wires this up against `AppState` so
   * `@openpeepshq/react` itself stays free of any `react-native` import.
   */
  subscribeToForeground?: (onForeground: () => void) => () => void;
}> = ({ children, credentialsStore, baseUrl, subscribeToForeground }) => {
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

  const endSession = useCallback(async () => {
    await credentialsStore.clear();
    queryClient.clear();
    setCurrentProfile(undefined);
    setCurrentAccount(undefined);
    redirectToLogin();
  }, [credentialsStore, queryClient]);

  useEffect(() => {
    const fetchProfile = async () => {
      const cred = await credentialsStore.get();
      if (!cred?.token) {
        setCurrentProfile(undefined);
        return;
      }
      // Service-only JWTs (jam observer links) have no profile — skip the fetch
      // so a 403 does not clear credentials and bounce to login.
      if (isServiceOnlyJwt(cred.token)) {
        setCurrentProfile(undefined);
        return;
      }
      const res = await client.profiles.current.read();
      if (!('data' in res)) {
        if (isAuthFailure(res.error)) {
          await endSession();
        }
        return;
      }
      setCurrentProfile(res.data);
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
  }, [credentialsStore, client, endSession]);

  useEffect(() => {
    const refreshIfExpiringSoon = async () => {
      const token = (await credentialsStore.get())?.token;
      if (!token?.trim()) return;
      // Observer/egress service JWTs are not refreshed via /auth/refresh.
      if (isServiceOnlyJwt(token)) {
        if (!jwtHasRemainingValidityAtLeast(token, 1)) {
          await endSession();
        }
        return;
      }
      if (!jwtHasRemainingValidityAtLeast(token, 1)) {
        await endSession();
        return;
      }
      if (
        jwtHasRemainingValidityAtLeast(token, REFRESH_WHEN_REMAINING_BELOW_SEC)
      ) {
        return;
      }
      const res = await client.auth.refresh({});
      if (!('data' in res)) {
        if (isAuthFailure(res.error)) {
          await endSession();
        }
        return;
      }
      await credentialsStore.set({ token: res.data.token });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'current'] });
      const profile = await client.profiles.current
        .read()
        .then((r) => ('data' in r ? r.data : undefined));
      setCurrentProfile(profile);
      const account = await client.accounts.current
        .read()
        .then((r) => ('data' in r ? r.data : undefined));
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
    } else if (subscribeToForeground) {
      const unsubscribe = subscribeToForeground(() => {
        void refreshIfExpiringSoon();
      });
      cleanups.push(unsubscribe);
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [
    client,
    credentialsStore,
    queryClient,
    subscribeToForeground,
    endSession,
  ]);

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
