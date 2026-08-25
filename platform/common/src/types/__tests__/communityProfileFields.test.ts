import { describe, expect, it } from 'vitest';
import {
  communityConfigSchema,
  communityProfileAdditionalFieldSchema,
} from '../config';

describe('communityProfileAdditionalFieldSchema', () => {
  it('accepts a non-empty key', () => {
    expect(
      communityProfileAdditionalFieldSchema.parse({
        key: 'company',
        label: 'Company',
      }),
    ).toEqual({ key: 'company', label: 'Company' });
  });

  it('trims keys and still requires a non-empty value', () => {
    expect(
      communityProfileAdditionalFieldSchema.parse({
        key: '  company  ',
        label: 'Company',
      }),
    ).toEqual({ key: 'company', label: 'Company' });

    expect(() =>
      communityProfileAdditionalFieldSchema.parse({
        key: '',
        label: 'Company',
      }),
    ).toThrow();

    expect(() =>
      communityProfileAdditionalFieldSchema.parse({
        key: '   ',
        label: 'Company',
      }),
    ).toThrow();
  });
});

describe('communityConfigSchema profiles.additionalFields', () => {
  const base = {
    theme: {
      base: 'OpenpeepsLight',
      light: { primaryHex: '#15678a' },
      dark: { primaryHex: '#15678a' },
    },
    info: { name: 'Test', tagLine: 'Tag' },
    content: {},
    settings: { openRegistrations: true },
    roles: {
      onRegistration: { add: [], remove: [] },
      onEmailValidation: { add: [], remove: [] },
    },
  };

  it('rejects empty additional field keys in the full community config', () => {
    const result = communityConfigSchema.safeParse({
      ...base,
      profiles: {
        additionalFields: [{ key: '', label: 'Company' }],
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.join('.').includes('additionalFields'),
        ),
      ).toBe(true);
    }
  });

  it('accepts non-empty additional field keys', () => {
    expect(
      communityConfigSchema.parse({
        ...base,
        profiles: {
          additionalFields: [{ key: 'company', label: 'Company' }],
        },
      }).profiles?.additionalFields,
    ).toEqual([{ key: 'company', label: 'Company' }]);
  });

  it('accepts an optional onboardingGuide block', () => {
    expect(
      communityConfigSchema.parse({
        ...base,
        onboardingGuide: {
          enabled: true,
          displayName: 'PeePs',
          subtitle: 'Community guide',
          tone: 'warm',
          quietHours: { startHour: 21, endHour: 8 },
          windowDays: 14,
          maxProactiveDmsPerDay: 1,
          maxProactiveDmsInWindow: 4,
          pushOnFirstIntro: false,
          enabledRungs: ['orient', 'join_group'],
          primaryInvite: 'both',
        },
      }).onboardingGuide?.displayName,
    ).toBe('PeePs');
  });
});
