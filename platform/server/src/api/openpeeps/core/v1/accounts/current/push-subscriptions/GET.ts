import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { pushSubscriptionSchema } from '@openpeepshq/common/types';
import { ensureAccount } from '#lib/auth';
import { listPushSubscriptionsByAccount } from '@openpeepshq/core/pushSubscriptions';

export const Output = pushSubscriptionSchema.array();

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(async (_, event) => {
  const account = ensureAccount(event);

  return listPushSubscriptionsByAccount(account);
});
