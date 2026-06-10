import { endpoint } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { stripeSubscriptionDataSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import {
  refreshStripeSubscription,
  stripeMembershipActive,
} from '@openpeeps/core/stripe';
import { ensureLocalProfile } from '#lib/auth';
import { getStripeCustomerId, hasValue, isOwnerProfile } from '@openpeeps/common';
import { findProfileSettings } from '@openpeeps/core/profileSettings';

export const Output = stripeSubscriptionDataSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    if (!(await stripeMembershipActive())) {
      return { success: false };
    }

    const profile = await ensureLocalProfile(event);
    if (isOwnerProfile(profile)) {
      return { success: true };
    }
    const profileSettings = await findProfileSettings(profile.id);
    const stripeCustomerId = getStripeCustomerId(profileSettings);
    if (!hasValue(stripeCustomerId)) {
      return { success: false };
    }

    return refreshStripeSubscription(stripeCustomerId!);
  },
);
