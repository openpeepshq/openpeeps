import { afterEach, describe, expect, it } from 'vitest';

const KEYS = [
  'COMMUNITY_ONBOARDING_GUIDE_ENABLED',
  'COMMUNITY_ONBOARDING_GUIDE_DISPLAY_NAME',
  'COMMUNITY_ONBOARDING_GUIDE_SUBTITLE',
  'COMMUNITY_ONBOARDING_GUIDE_TONE',
  'COMMUNITY_ONBOARDING_GUIDE_QUIET_HOURS_START',
  'COMMUNITY_ONBOARDING_GUIDE_QUIET_HOURS_END',
  'COMMUNITY_ONBOARDING_GUIDE_WINDOW_DAYS',
  'COMMUNITY_ONBOARDING_GUIDE_MAX_PER_DAY',
  'COMMUNITY_ONBOARDING_GUIDE_MAX_IN_WINDOW',
  'COMMUNITY_ONBOARDING_GUIDE_PUSH_ON_FIRST_INTRO',
  'COMMUNITY_ONBOARDING_GUIDE_PRIMARY_INVITE',
  'COMMUNITY_ONBOARDING_GUIDE_ENABLED_RUNGS',
  'COMMUNITY_ONBOARDING_GUIDE_CUSTOM_HOST_BLURB',
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('onboardingGuideConfigFromEnv', () => {
  it('keeps the built-in defaults when env is unset', async () => {
    for (const key of KEYS) delete process.env[key];
    const { onboardingGuideConfigFromEnv } = await import('./community');
    expect(onboardingGuideConfigFromEnv()).toMatchObject({
      enabled: true,
      displayName: 'PeePs',
      tone: 'warm',
      primaryInvite: 'both',
      pushOnFirstIntro: false,
    });
  });

  it('disables the guide when ENABLED=false', async () => {
    process.env.COMMUNITY_ONBOARDING_GUIDE_ENABLED = 'false';
    const { onboardingGuideConfigFromEnv } = await import('./community');
    expect(onboardingGuideConfigFromEnv().enabled).toBe(false);
  });

  it('applies name, tone, cadence, and rungs from env', async () => {
    process.env.COMMUNITY_ONBOARDING_GUIDE_DISPLAY_NAME = 'Host';
    process.env.COMMUNITY_ONBOARDING_GUIDE_TONE = 'formal';
    process.env.COMMUNITY_ONBOARDING_GUIDE_WINDOW_DAYS = '7';
    process.env.COMMUNITY_ONBOARDING_GUIDE_MAX_PER_DAY = '2';
    process.env.COMMUNITY_ONBOARDING_GUIDE_PRIMARY_INVITE = 'dock';
    process.env.COMMUNITY_ONBOARDING_GUIDE_PUSH_ON_FIRST_INTRO = 'true';
    process.env.COMMUNITY_ONBOARDING_GUIDE_ENABLED_RUNGS = 'orient,join_group';
    process.env.COMMUNITY_ONBOARDING_GUIDE_CUSTOM_HOST_BLURB = 'Hello';
    const { onboardingGuideConfigFromEnv } = await import('./community');
    expect(onboardingGuideConfigFromEnv()).toMatchObject({
      displayName: 'Host',
      tone: 'formal',
      windowDays: 7,
      maxProactiveDmsPerDay: 2,
      primaryInvite: 'dock',
      pushOnFirstIntro: true,
      enabledRungs: ['orient', 'join_group'],
      customHostBlurb: 'Hello',
    });
  });

  it('ignores invalid tone, invite, and rungs', async () => {
    process.env.COMMUNITY_ONBOARDING_GUIDE_TONE = 'sassy';
    process.env.COMMUNITY_ONBOARDING_GUIDE_PRIMARY_INVITE = 'carrier-pigeon';
    process.env.COMMUNITY_ONBOARDING_GUIDE_ENABLED_RUNGS = 'nope,also-no';
    const { onboardingGuideConfigFromEnv } = await import('./community');
    const config = onboardingGuideConfigFromEnv();
    expect(config.tone).toBe('warm');
    expect(config.primaryInvite).toBe('both');
    expect(config.enabledRungs).not.toContain('nope');
  });
});
