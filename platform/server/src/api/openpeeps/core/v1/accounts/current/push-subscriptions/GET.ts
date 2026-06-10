import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { pushSubscriptionDataSchema } from '@openpeeps/common/types';
import { ensureAccount } from '#lib/auth';
import { listPushSubscriptionsByAccount } from '@openpeeps/core/pushSubscriptions';

export const Output = pushSubscriptionDataSchema.array();

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(async (_, event) => {
  const account = ensureAccount(event);

  return listPushSubscriptionsByAccount(account);
});
