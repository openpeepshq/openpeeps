import {
  ONBOARDING_RUNGS,
  type OnboardingGuideConfig,
  type OnboardingGuideState,
  type OnboardingRung,
} from '../types';

export const DEFAULT_CHATBOT_HANDLE = 'chatbot';
export const INVITATION_SUPPRESS_DAYS = 7;
export const SNOOZE_DAYS = 7;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_ENABLED_RUNGS: OnboardingRung[] = ONBOARDING_RUNGS.filter(
  (rung) => rung !== 'deeper_share',
);

export const DEFAULT_ONBOARDING_GUIDE_CONFIG: OnboardingGuideConfig = {
  enabled: true,
  displayName: 'PeePs',
  subtitle: 'Community guide',
  tone: 'warm',
  quietHours: { startHour: 21, endHour: 8 },
  windowDays: 14,
  maxProactiveDmsPerDay: 1,
  maxProactiveDmsInWindow: 4,
  pushOnFirstIntro: false,
  enabledRungs: DEFAULT_ENABLED_RUNGS,
  primaryInvite: 'both',
};

export const DEFAULT_ONBOARDING_GUIDE_STATE: OnboardingGuideState = {
  status: 'active',
  proactive: true,
  completedRungs: [],
  invitationDismissals: [],
};

export const resolveOnboardingGuideConfig = (
  partial?: Partial<OnboardingGuideConfig> | null,
): OnboardingGuideConfig => ({
  ...DEFAULT_ONBOARDING_GUIDE_CONFIG,
  ...partial,
  quietHours: {
    ...DEFAULT_ONBOARDING_GUIDE_CONFIG.quietHours,
    ...partial?.quietHours,
  },
  enabledRungs:
    partial?.enabledRungs && partial.enabledRungs.length > 0
      ? partial.enabledRungs
      : DEFAULT_ONBOARDING_GUIDE_CONFIG.enabledRungs,
});

export const resolveOnboardingGuideState = (
  partial?: OnboardingGuideState | null,
): OnboardingGuideState => ({
  ...DEFAULT_ONBOARDING_GUIDE_STATE,
  ...partial,
  status: partial?.status ?? DEFAULT_ONBOARDING_GUIDE_STATE.status,
  proactive: partial?.proactive ?? DEFAULT_ONBOARDING_GUIDE_STATE.proactive,
  completedRungs:
    partial?.completedRungs ?? DEFAULT_ONBOARDING_GUIDE_STATE.completedRungs,
  invitationDismissals:
    partial?.invitationDismissals ??
    DEFAULT_ONBOARDING_GUIDE_STATE.invitationDismissals,
});

export const daysBetween = (iso: string, now: Date): number =>
  (now.getTime() - new Date(iso).getTime()) / MS_PER_DAY;

export const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isQuietHour = (
  now: Date,
  quietHours: OnboardingGuideConfig['quietHours'],
): boolean => {
  const hour = now.getHours();
  const { startHour, endHour } = quietHours;
  if (startHour === endHour) return false;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
};

export const isWithinOnboardingWindow = (
  createdAt: string | undefined,
  windowDays: number,
  now: Date,
): boolean => {
  if (!createdAt) return true;
  return daysBetween(createdAt, now) < windowDays;
};

export const isSnoozed = (state: OnboardingGuideState, now: Date): boolean =>
  !!state.snoozedUntil &&
  new Date(state.snoozedUntil).getTime() > now.getTime();

export const isInvitationSuppressed = (
  state: OnboardingGuideState,
  surface: string,
  now: Date,
  suppressDays = INVITATION_SUPPRESS_DAYS,
): boolean => {
  const last = [...(state.invitationDismissals ?? [])]
    .reverse()
    .find((dismissal) => dismissal.surface === surface);
  if (!last) return false;
  if (last.forever) return true;
  return daysBetween(last.at, now) < suppressDays;
};

export const isProactiveAllowed = ({
  config,
  state,
  createdAt,
  now,
}: {
  config: OnboardingGuideConfig;
  state: OnboardingGuideState;
  createdAt?: string;
  now: Date;
}): boolean => {
  if (!config.enabled) return false;
  if (!state.proactive) return false;
  if (state.status === 'muted' || state.status === 'quiet') return false;
  if (isSnoozed(state, now)) return false;
  if (!isWithinOnboardingWindow(createdAt, config.windowDays, now)) {
    return false;
  }
  return true;
};

export const canSendProactiveDm = ({
  config,
  state,
  createdAt,
  now,
}: {
  config: OnboardingGuideConfig;
  state: OnboardingGuideState;
  createdAt?: string;
  now: Date;
}): boolean => {
  if (!isProactiveAllowed({ config, state, createdAt, now })) return false;
  if (config.primaryInvite === 'dock') return false;
  if (isQuietHour(now, config.quietHours)) return false;
  if (config.maxProactiveDmsPerDay <= 0) return false;
  if ((state.proactiveCount ?? 0) >= config.maxProactiveDmsInWindow) {
    return false;
  }
  if (
    state.lastProactiveAt &&
    isSameLocalDay(new Date(state.lastProactiveAt), now)
  ) {
    return false;
  }
  return true;
};

export const shouldAutoOpenDock = ({
  config,
  state,
  createdAt,
  now,
}: {
  config: OnboardingGuideConfig;
  state: OnboardingGuideState;
  createdAt?: string;
  now: Date;
}): boolean => {
  if (!isProactiveAllowed({ config, state, createdAt, now })) return false;
  if (config.primaryInvite === 'dm_only') return false;
  if (isQuietHour(now, config.quietHours)) return false;
  if (state.dockShownAt) return false;
  if (isInvitationSuppressed(state, 'dock', now)) return false;
  return true;
};

export const shouldShowFab = ({
  config,
  state,
  createdAt,
  now,
}: {
  config: OnboardingGuideConfig;
  state: OnboardingGuideState;
  createdAt?: string;
  now: Date;
}): boolean => {
  if (!config.enabled) return false;
  if (state.status === 'muted') return false;
  if (!isWithinOnboardingWindow(createdAt, config.windowDays, now)) {
    return false;
  }
  if (isInvitationSuppressed(state, 'fab', now)) return false;
  return true;
};

export const shouldShowEmptyInvite = ({
  config,
  state,
  createdAt,
  now,
  surface,
}: {
  config: OnboardingGuideConfig;
  state: OnboardingGuideState;
  createdAt?: string;
  now: Date;
  surface: string;
}): boolean => {
  if (!config.enabled) return false;
  if (state.status === 'muted') return false;
  if (!isWithinOnboardingWindow(createdAt, config.windowDays, now)) {
    return false;
  }
  if (isInvitationSuppressed(state, surface, now)) return false;
  return true;
};

export const nextMissingRung = (
  completed: readonly OnboardingRung[],
  enabled: readonly OnboardingRung[],
): OnboardingRung | undefined =>
  enabled.find((rung) => !completed.includes(rung));

export const withDismissal = (
  state: OnboardingGuideState,
  surface: string,
  now: Date,
  forever = false,
): OnboardingGuideState => ({
  ...state,
  invitationDismissals: [
    ...(state.invitationDismissals ?? []),
    { surface, at: now.toISOString(), forever: forever || undefined },
  ],
});

export const withSnooze = (
  state: OnboardingGuideState,
  now: Date,
  days = SNOOZE_DAYS,
): OnboardingGuideState => ({
  ...state,
  proactive: false,
  status: 'quiet',
  snoozedUntil: new Date(now.getTime() + days * MS_PER_DAY).toISOString(),
});

export const withMute = (state: OnboardingGuideState, now: Date) =>
  withDismissal(
    withDismissal(
      { ...state, proactive: false, status: 'muted' },
      'dock',
      now,
      true,
    ),
    'fab',
    now,
    true,
  );

export const audienceIncludesHandle = (
  audience: { handle: string }[] | undefined | null,
  handle: string,
): boolean =>
  audience?.some((p) => p.handle.toLowerCase() === handle.toLowerCase()) ??
  false;

export const findGuideConversation = <
  T extends {
    id?: string;
    audience?: { id: string; handle: string }[] | null;
  },
>(
  conversations: T[][],
  chatbotId: string,
): T[] | undefined =>
  conversations.find((conversation) => {
    const last = conversation[conversation.length - 1] ?? conversation[0];
    return last?.audience?.some((profile) => profile.id === chatbotId);
  });
