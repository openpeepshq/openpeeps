import { Endpoint } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { successFailureResponseSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import {
  checkSubscription,
  stripeMembershipActive,
} from '@openpeeps/core/stripe';
import { ensureAccount, ensureLocalProfile } from '$lib/server/auth';

export const Output = successFailureResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    if (!(await stripeMembershipActive())) {
      return { success: false };
    }

    const profile = await ensureLocalProfile(event, false);
    const account = ensureAccount(event);

    return {
      success: await checkSubscription(profile, account, true),
    };
  },
);
