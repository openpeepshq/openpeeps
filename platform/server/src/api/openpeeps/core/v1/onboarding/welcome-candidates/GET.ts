import { ensureServiceScope } from '#lib/auth';
import { endpoint, z } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import {
  onboardingProactiveMessageKindSchema,
  onboardingRungSchema,
  publicProfileSchema,
} from '@openpeepshq/common/types';
import { communityConfig } from '@openpeepshq/core/config';
import { listWelcomeCandidates } from '@openpeepshq/core/onboarding';
import type { RequestEvent } from '@riddl/core';

export const WelcomeCandidate = z.object({
  profileId: z.string().uuid(),
  profile: publicProfileSchema,
  audience: publicProfileSchema.array(),
  locale: z.string(),
  conversationId: z.string().optional(),
  intent: z.object({
    id: z.string(),
    messageKind: onboardingProactiveMessageKindSchema,
    dayKey: z.string(),
    suggestedRung: onboardingRungSchema.optional(),
  }),
});

export const Output = WelcomeCandidate.array();

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const toWelcomeCandidate = (
  candidate: Awaited<ReturnType<typeof listWelcomeCandidates>>[number],
) => ({
  profileId: candidate.profileId,
  profile: candidate.profile,
  audience: candidate.audience,
  locale: candidate.locale,
  ...(candidate.conversationId
    ? { conversationId: candidate.conversationId }
    : {}),
  intent: candidate.intent,
});

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => {
    await ensureServiceScope(event, 'read', { type: 'profiles', id: '*' });
    const community = await communityConfig();
    const config = community.onboardingGuide;
    if (!config?.enabled) return [];
    const candidates = await listWelcomeCandidates(
      config,
      community.settings.defaultLanguage ?? 'en',
    );
    return candidates.map(toWelcomeCandidate);
  },
);
