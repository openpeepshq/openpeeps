import { endpoint, z } from '#lib/endpoint';
import { ensureAccount } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { forbidden, notFound } from '#lib/errors';
import { successResponseSchema } from '@openpeepshq/common/types';
import { findPushSubscription, deletePushSubscription, listPushSubscriptionsByAccount } from '@openpeepshq/core/pushSubscriptions';

export const Param = z.object({
  pushSubscriptionId: z.string(),
});
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {

    const account = ensureAccount(event);

    const accountSubscriptions = await listPushSubscriptionsByAccount(account)

    if (!accountSubscriptions.find((subscription) => subscription.id === param.pushSubscriptionId)) {
      throw forbidden('You do not have permission to delete this push subscription');
    }

    const pushSubscription = await findPushSubscription(param.pushSubscriptionId);

    if (!pushSubscription) {
      throw notFound(`Push Subscription with id ${param.pushSubscriptionId}`);
    }


    await deletePushSubscription(param.pushSubscriptionId)

    return { success: true };
  },
);