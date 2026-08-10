import { endpoint } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { successFailureResponseSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import {
  checkSubscription,
  stripeMembershipActive,
} from '@openpeepshq/core/stripe';
import { ensureAccount, ensureLocalProfile } from '#lib/auth';

export const Output = successFailureResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
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
