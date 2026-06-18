import { endpoint } from '#lib/endpoint';
import { ensureAccount } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import {
  pushSubscriptionDataSchema,
  pushSubscriptionSchema,
} from '@openpeeps/common/types';
import { createPushSubscription } from '@openpeeps/core/pushSubscriptions';

export const Input = pushSubscriptionDataSchema;
export const Output = pushSubscriptionSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const account = ensureAccount(event);

    return createPushSubscription(account, input);
  },
);
