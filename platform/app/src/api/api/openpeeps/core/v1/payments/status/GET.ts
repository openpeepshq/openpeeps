import { Endpoint } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import { stripeSubscriptionDataSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import {
  refreshStripeSubscription,
  stripeMembershipActive,
} from '@openpeeps/core/stripe';
import { ensureLocalProfile } from '$lib/server/auth';
import { getStripeCustomerId, hasValue, isOwnerProfile } from '@openpeeps/common';
import { findProfileSettings } from '@openpeeps/core/profileSettings';

export const Output = stripeSubscriptionDataSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    if (!(await stripeMembershipActive())) {
      return { status: 'none' as const };
    }

    const profile = await ensureLocalProfile(event);
    if (isOwnerProfile(profile)) {
      return { status: 'none' as const };
    }
    const profileSettings = await findProfileSettings(profile.id);
    const stripeCustomerId = getStripeCustomerId(profileSettings);
    if (!hasValue(stripeCustomerId)) {
      return { status: 'none' as const };
    }

    return refreshStripeSubscription(stripeCustomerId!);
  },
);
