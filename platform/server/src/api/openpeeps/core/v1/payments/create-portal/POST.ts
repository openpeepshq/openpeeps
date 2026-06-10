import { endpoint } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { stripeCustomerPortalResponseSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import {
  stripeMembershipActive,
  createStripeCustomerPortal,
} from '@openpeeps/core/stripe';
import { ensureLocalProfile } from '#lib/auth';
import { getStripeCustomerId, hasValue, isOwnerProfile } from '@openpeeps/common';
import { findProfileSettings } from '@openpeeps/core/profileSettings';

export const Output = stripeCustomerPortalResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
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
    if (!profileSettings) {
      return { success: false , message: 'Profile settings not found'};
    }
    const stripeCustomerId = getStripeCustomerId(profileSettings);
    if (!hasValue(stripeCustomerId)) {
      return { success: false };
    }

    const url = await createStripeCustomerPortal(stripeCustomerId!);
    return stripeCustomerPortalResponseSchema.parse({
      success: true,
      url,
    });
  },
);
