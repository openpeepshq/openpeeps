import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, noPayloadMutation, payloadMutation } from '../helpers';

export const accountHooks = (client: OpenpeepsClient) => ({
  useCurrentAccount: () => apiHook(client.accounts.current.read),
  updateCurrentAccountAction: payloadMutation(client.accounts.current.update, [
    ['accounts'],
    ['current'],
  ]),
  createPushSubscriptionAction: payloadMutation(
    client.accounts.current.createPushSubscription,
    [['accounts'], ['current']]
  ),
  usePushSubscriptions: () =>
    apiHook(client.accounts.current.listPushSubscriptions),
  validationEmailAction: noPayloadMutation(
    client.accounts.current.validationEmail,
  ),
});

export type AccountHooks = ReturnType<typeof accountHooks>;
