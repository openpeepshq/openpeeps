import { describe, expect, it } from 'vitest';
import { analyticsOnboardingStepKeySchema } from '@openpeepshq/common/types';
import { lookup, readLocale } from './localeTestUtils';
import {
  ONBOARDING_STEP_LABEL_KEYS,
  onboardingStepLabelKey,
} from './onboardingSteps';

// This test pins both locales because it asserts *key presence* (the admin
// UI must resolve every step label in en and de); Onboarding.test.tsx pins
// only en because it asserts resolved *copy*. Both share localeTestUtils.ts.
const en = readLocale('en');
const de = readLocale('de');

describe('onboarding step label keys', () => {
  it('maps every funnel step to a locale key that exists in both locales', () => {
    // Guards against a dangling fallback: the admin UI must never resolve a
    // step label through a key missing from en/de (which would silently serve
    // the raw English step.label, e.g. to German admins).
    expect(Object.keys(ONBOARDING_STEP_LABEL_KEYS).sort()).toEqual([
      'email',
      'follow',
      'group',
      'post',
      'profile',
    ]);
    for (const key of Object.values(ONBOARDING_STEP_LABEL_KEYS)) {
      expect(lookup(en, key), `en missing ${key}`).not.toBeNull();
      expect(lookup(de, key), `de missing ${key}`).not.toBeNull();
    }
  });

  it('keeps the label-key mapping in Welcome checklist (schema) order', () => {
    // The UI order is data: the chart, table, and both per-section CSVs all
    // render `data.steps` in the order the server derives from this mapping's
    // Object.keys, so a reorder here must move with the canonical step schema
    // (read.test.ts pins the server's output against the same schema).
    expect(Object.keys(ONBOARDING_STEP_LABEL_KEYS)).toEqual(
      analyticsOnboardingStepKeySchema.options,
    );
  });

  it('reuses the Welcome checklist copy for the first four steps', () => {
    expect(onboardingStepLabelKey({ key: 'email' })).toBe(
      'welcome.verifyEmail',
    );
    expect(onboardingStepLabelKey({ key: 'profile' })).toBe(
      'welcome.addProfileDetails',
    );
    expect(onboardingStepLabelKey({ key: 'follow' })).toBe('welcome.connect');
    expect(onboardingStepLabelKey({ key: 'post' })).toBe('welcome.firstPost');
    expect(onboardingStepLabelKey({ key: 'group' })).toBe(
      'admin.analytics.onboarding.group',
    );
  });
});
