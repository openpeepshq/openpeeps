import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, noPayloadMutation, payloadMutation } from '../helpers';
import { useHasAuthToken } from './useHasAuthToken';

export const accountHooks = (client: OpenpeepsClient) => ({
  useCurrentAccount: () => {
    const hasToken = useHasAuthToken();
    return apiHook(client.accounts.current.read, { enabled: hasToken });
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
    deletePushSubscriptionAction: noPayloadMutation(client.accounts.current.deletePushSubcription,
    [['accounts'], ['current']]
  ),
});

export type AccountHooks = ReturnType<typeof accountHooks>;
