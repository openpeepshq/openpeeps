import { Endpoint } from 'sveltekit-api';
import { ensureAccount } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { pushSubscriptionDataSchema } from '@openpeeps/common/types';
import { createPushSubscription } from '@openpeeps/core/pushSubscriptions';

export const Input = pushSubscriptionDataSchema;
export const Output = pushSubscriptionDataSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const account = ensureAccount(event);

    return createPushSubscription(account, input);
  },
);
