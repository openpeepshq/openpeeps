import type { AnalyticsOnboardingStep } from '@openpeepshq/common/types';

/**
 * The locale key each onboarding step's label resolves through in the admin
 * UI. Four steps reuse the member-facing Welcome checklist copy; the fifth
 * uses the onboarding section's own key. Every key exists in both locales —
 * pinned by onboardingSteps.test.ts — so the raw English step.label default
 * never surfaces in the UI (it is only used as a zod-safe fallback).
 */
export const ONBOARDING_STEP_LABEL_KEYS: Record<
  AnalyticsOnboardingStep['key'],
  string
> = {
  email: 'welcome.verifyEmail',
  profile: 'welcome.addProfileDetails',
  follow: 'welcome.connect',
  post: 'welcome.firstPost',
  group: 'admin.analytics.onboarding.group',
};

export const onboardingStepLabelKey = (
  step: Pick<AnalyticsOnboardingStep, 'key'>,
): string => ONBOARDING_STEP_LABEL_KEYS[step.key];
