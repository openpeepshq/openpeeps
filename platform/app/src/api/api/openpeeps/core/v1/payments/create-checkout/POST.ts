import { Endpoint } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { paymentCheckoutSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import {
  stripeMembershipActive,
  createStripeCheckoutUrl,
} from '@openpeeps/core/stripe';
import {
  ensureAccount,
  ensureLocalProfile,
} from '$lib/server/auth';
import { isOwnerProfile } from '@openpeeps/common';

export const Output = paymentCheckoutSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Output, Error }).handle(
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
