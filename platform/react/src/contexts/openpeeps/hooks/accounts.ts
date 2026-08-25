import { useEffect, useState } from 'react';
import type { OpenpeepsClient } from '@openpeepshq/client';
import { isAccountlessJwt, isServiceOnlyJwt } from '@openpeepshq/common';
import {
  AUTH_CREDENTIALS_STORAGE_KEY,
  subscribeCredentialsChanged,
} from '../../../auth/credentials';
import { useCredentialsStore } from '../../credentialsStore';
import { apiHook, noPayloadMutation, payloadMutation } from '../helpers';
import { useHasAuthToken } from './useHasAuthToken';

/** True when the stored JWT includes an account identity (not guest/service). */
const useHasAccountJwt = (): boolean => {
  const { credentialsStore } = useCredentialsStore();
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const token = (await credentialsStore.get())?.token;
      const next =
        !!token &&
        !isAccountlessJwt(token) &&
        !isServiceOnlyJwt(token);
      if (!cancelled) setHasAccount(next);
    };

    void refresh();
    const unsubCredentials = subscribeCredentialsChanged(() => void refresh());

    const hasWindow =
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function';
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_CREDENTIALS_STORAGE_KEY || e.key === null) {
        void refresh();
      }
    };
    if (hasWindow) window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      unsubCredentials();
      if (hasWindow) window.removeEventListener('storage', onStorage);
    };
  }, [credentialsStore]);

  return hasAccount;
};

export const accountHooks = (client: OpenpeepsClient) => ({
  useCurrentAccount: () => {
    const hasToken = useHasAuthToken();
    const hasAccountJwt = useHasAccountJwt();
    return apiHook(client.accounts.current.read, {
      enabled: hasToken && hasAccountJwt,
    });
  },
  updateCurrentAccountAction: payloadMutation(client.accounts.current.update, [
    ['accounts'],
    ['current'],
  ]),
  createPushSubscriptionAction: payloadMutation(
    client.accounts.current.createPushSubscription,
    [['accounts'], ['current']],
  ),
  usePushSubscriptions: () =>
    apiHook(client.accounts.current.listPushSubscriptions),
  validationEmailAction: noPayloadMutation(
    client.accounts.current.validationEmail,
  ),
  testPushSubscriptionAction: payloadMutation(
    client.accounts.current.testPushSubscription,
  ),
  deletePushSubscriptionAction: noPayloadMutation(
    client.accounts.current.deletePushSubcription,
    [['accounts'], ['current']],
  ),
});

export type AccountHooks = ReturnType<typeof accountHooks>;
