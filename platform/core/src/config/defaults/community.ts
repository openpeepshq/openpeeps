import { DEFAULT_ONBOARDING_GUIDE_CONFIG } from '@openpeepshq/common';
import {
  ONBOARDING_RUNGS,
  type CommunityConfig,
  type OnboardingGuideConfig,
  type OnboardingRung,
} from '@openpeepshq/common/types';
import dotenv from 'dotenv';
import { readEnvInteger } from '../helpers';

dotenv.config();

const TONES: OnboardingGuideConfig['tone'][] = ['warm', 'neutral', 'formal'];
const PRIMARY_INVITES: OnboardingGuideConfig['primaryInvite'][] = [
  'dock',
  'dm_only',
  'both',
];

const envString = (key: string, fallback: string) =>
  process.env[key] || fallback;

const envHour = (key: string, fallback: number) => {
  const value = readEnvInteger(key, fallback);
  return Number.isInteger(value) && value >= 0 && value <= 23
    ? value
    : fallback;
};

const envRungs = (): OnboardingRung[] | undefined => {
  const raw = process.env.COMMUNITY_ONBOARDING_GUIDE_ENABLED_RUNGS;
  if (!raw) return undefined;
  const rungs = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is OnboardingRung =>
      (ONBOARDING_RUNGS as readonly string[]).includes(entry),
    );
  return rungs.length > 0 ? rungs : undefined;
};

export const onboardingGuideConfigFromEnv = (): OnboardingGuideConfig => {
  const defaults = DEFAULT_ONBOARDING_GUIDE_CONFIG;
  const tone = process.env.COMMUNITY_ONBOARDING_GUIDE_TONE;
  const primaryInvite = process.env.COMMUNITY_ONBOARDING_GUIDE_PRIMARY_INVITE;
  const customHostBlurb =
    process.env.COMMUNITY_ONBOARDING_GUIDE_CUSTOM_HOST_BLURB;
  return {
    ...defaults,
    enabled: process.env.COMMUNITY_ONBOARDING_GUIDE_ENABLED !== 'false',
    displayName: envString(
      'COMMUNITY_ONBOARDING_GUIDE_DISPLAY_NAME',
      defaults.displayName,
    ),
    subtitle: envString(
      'COMMUNITY_ONBOARDING_GUIDE_SUBTITLE',
      defaults.subtitle,
    ),
    tone: TONES.includes(tone as OnboardingGuideConfig['tone'])
      ? (tone as OnboardingGuideConfig['tone'])
      : defaults.tone,
    quietHours: {
      startHour: envHour(
        'COMMUNITY_ONBOARDING_GUIDE_QUIET_HOURS_START',
        defaults.quietHours.startHour,
      ),
      endHour: envHour(
        'COMMUNITY_ONBOARDING_GUIDE_QUIET_HOURS_END',
        defaults.quietHours.endHour,
      ),
    },
    windowDays: readEnvInteger(
      'COMMUNITY_ONBOARDING_GUIDE_WINDOW_DAYS',
      defaults.windowDays,
    ),
    maxProactiveDmsPerDay: readEnvInteger(
      'COMMUNITY_ONBOARDING_GUIDE_MAX_PER_DAY',
      defaults.maxProactiveDmsPerDay,
    ),
    maxProactiveDmsInWindow: readEnvInteger(
      'COMMUNITY_ONBOARDING_GUIDE_MAX_IN_WINDOW',
      defaults.maxProactiveDmsInWindow,
    ),
    pushOnFirstIntro:
      process.env.COMMUNITY_ONBOARDING_GUIDE_PUSH_ON_FIRST_INTRO === 'true',
    enabledRungs: envRungs() ?? defaults.enabledRungs,
    primaryInvite: PRIMARY_INVITES.includes(
      primaryInvite as OnboardingGuideConfig['primaryInvite'],
    )
      ? (primaryInvite as OnboardingGuideConfig['primaryInvite'])
      : defaults.primaryInvite,
    ...(customHostBlurb ? { customHostBlurb } : {}),
  };
};

export const defaultCommunityConfig: CommunityConfig = {
  theme: {
    base: 'OpenpeepsLight',
    icon: '/img/icon.svg',
    light: {
      primaryHex: '#15678a',
      logoSmall: '/img/logo-small.png',
      defaultProfileAvatar: '/img/default-avatar.png',
      defaultGroupAvatar: '/img/default-group-avatar.svg',
      backgroundAuth: '/img/background-auth.png',
    },
    dark: {
      primaryHex: '#15678a',
      logoSmall: '/img/logo-small-white.png',
      defaultProfileAvatar: '/img/default-avatar.png',
      defaultGroupAvatar: '/img/default-group-avatar.svg',
      backgroundAuth: '/img/background-auth.png',
    },
  },
  info: {
    name: process.env.COMMUNITY_INFO_NAME || 'Your OpenPeeps Community',
    tagLine:
      process.env.COMMUNITY_INFO_TAG_LINE ||
      "Don't build your house on someone else's ground!",
  },
  settings: {
    openRegistrations:
      process.env.COMMUNITY_SETTINGS_OPEN_REGISTRATIONS !== 'false',
  },
  content: {},
  roles: {
    onRegistration: { add: ['pendingmember'], remove: [] },
    onEmailValidation: { add: ['member'], remove: ['pendingmember'] },
  },
  onboardingGuide: onboardingGuideConfigFromEnv(),
};
