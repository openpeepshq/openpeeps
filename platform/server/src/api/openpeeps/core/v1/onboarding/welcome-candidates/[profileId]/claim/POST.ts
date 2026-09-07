import { ensureServiceScope } from '#lib/auth';
import { endpoint, z } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { communityConfig } from '@openpeepshq/core/config';
import { claimWelcomeDelivery } from '@openpeepshq/core/onboarding';
import type { RequestEvent } from '@riddl/core';
import { WelcomeCandidate, toWelcomeCandidate } from '../../GET';

export const Param = z.object({
  profileId: z.string().uuid(),
});

export const Input = z.object({
  intentId: z.string().min(1),
  postId: z.string().min(1),
  conversationId: z.string().min(1),
});

export const Output = z.object({
  claimed: z.boolean(),
  candidate: WelcomeCandidate.optional(),
});

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (
    {
      profileId,
      intentId,
      postId,
      conversationId,
    }: {
      profileId: string;
      intentId: string;
      postId: string;
      conversationId: string;
    },
    event: RequestEvent,
  ) => {
    await ensureServiceScope(event, 'write', {
      type: 'profiles',
      id: profileId,
    });
    const community = await communityConfig();
    const config = community.onboardingGuide;
    if (!config?.enabled) return { claimed: false };
    const candidate = await claimWelcomeDelivery({
      profileId,
      intentId,
      postId,
      conversationId,
      config,
      defaultLocale: community.settings.defaultLanguage ?? 'en',
    });
    return candidate
      ? { claimed: true, candidate: toWelcomeCandidate(candidate) }
      : { claimed: false };
  },
);
