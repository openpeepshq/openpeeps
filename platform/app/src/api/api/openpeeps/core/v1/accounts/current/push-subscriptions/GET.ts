import { Endpoint } from 'sveltekit-api';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { pushSubscriptionDataSchema } from '@openpeeps/common/types';
import { ensureAccount } from '$lib/server/auth';
import { listPushSubscriptionsByAccount } from '@openpeeps/core/pushSubscriptions';

export const Output = pushSubscriptionDataSchema.array();

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export default new Endpoint({ Output, Error }).handle(async (_, event) => {
  const account = ensureAccount(event);

  return listPushSubscriptionsByAccount(account);
});
