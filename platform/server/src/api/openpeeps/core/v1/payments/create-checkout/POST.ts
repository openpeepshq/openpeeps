import { endpoint } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { paymentCheckoutSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import {
  stripeMembershipActive,
  createStripeCheckoutUrl,
} from '@openpeepshq/core/stripe';
import {
  ensureAccount,
  ensureLocalProfile,
} from '#lib/auth';
import { isOwnerProfile } from '@openpeepshq/common';

export const Output = paymentCheckoutSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    if (!(await stripeMembershipActive())) {
      throw forbidden();
    }

    const profile = await ensureLocalProfile(event, false);
    if (isOwnerProfile(profile)) {
      return { success: true, url: '' };
    }
    const account = ensureAccount(event);
    return { success: true, url: await createStripeCheckoutUrl(profile, account) || '' };
  },
);
