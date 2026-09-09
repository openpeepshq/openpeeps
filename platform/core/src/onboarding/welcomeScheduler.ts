import {
  DEFAULT_CHATBOT_HANDLE,
  canSendProactiveDm,
  daysBetween,
  nextMissingRung,
  resolveOnboardingGuideConfig,
  resolveOnboardingGuideState,
} from '@openpeepshq/common';
import {
  onboardingGuideStateSchema,
  pluginSettingsEnvelopeSchema,
  publicProfileSchema,
  type OnboardingGuideConfig,
  type OnboardingProactiveMessageKind,
  type OnboardingGuideState,
  type OnboardingRung,
  type PluginSettingsEnvelope,
  type ProfileWithMeta,
  type PublicProfile,
} from '@openpeepshq/common/types';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { database, type PgDb } from '../db';
import { profileSettings, profiles } from '../db/pg/schema';
import { findProfileByHandle, getPublicProfile } from '../profiles';
import { findPost, getConversationByEnd } from '../posts';
import { getProfileSettingsSchema } from '../plugins';

const ONBOARDING_PLUGIN_KEY = 'allpeep/peeps-onboarding';

type ProfileRow = {
  id: string;
  handle: string;
  body: unknown;
  createdAt: string;
  updatedAt: string;
};

type SettingsRow = {
  id: string;
  body: unknown;
};

export type WelcomeIntent = {
  id: string;
  messageKind: OnboardingProactiveMessageKind;
  dayKey: string;
  suggestedRung?: OnboardingRung;
};

export type WelcomeCandidate = {
  profileId: string;
  profile: PublicProfile;
  audience: PublicProfile[];
  locale: string;
  conversationId?: string;
  config: OnboardingGuideConfig;
  state: OnboardingGuideState;
  intent: WelcomeIntent;
};

const recordBody = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const stateFromSettings = (body: unknown): OnboardingGuideState | undefined => {
  const rawState = recordBody(body).onboardingGuide;
  if (rawState === undefined) return resolveOnboardingGuideState();
  const result = onboardingGuideStateSchema.safeParse(rawState);
  return result.success ? resolveOnboardingGuideState(result.data) : undefined;
};

type CheckpointPolicy = {
  progress: boolean;
  openDoor: boolean;
};

type OnboardingPluginSettings = {
  data: Record<string, unknown> & {
    optedOut: boolean;
    pausedUntil: string | null;
    checkpointPolicy: CheckpointPolicy;
  };
  envelope: PluginSettingsEnvelope;
  pluginSettings: Record<string, unknown>;
};

const DEFAULT_CHECKPOINT_POLICY: CheckpointPolicy = {
  progress: true,
  openDoor: true,
};

const checkpointPolicyFromData = (
  data: Record<string, unknown>,
): CheckpointPolicy => {
  const raw = data.checkpointPolicy;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_CHECKPOINT_POLICY;
  }
  const policy = raw as Record<string, unknown>;
  return {
    progress: policy.progress !== false,
    openDoor: policy.openDoor !== false,
  };
};

const onboardingPluginSettingsFromBody = (
  body: unknown,
): OnboardingPluginSettings | undefined => {
  const registered = getProfileSettingsSchema(ONBOARDING_PLUGIN_KEY);
  if (!registered) return undefined;
  const rawPluginSettings = recordBody(body).pluginSettings;
  if (
    rawPluginSettings !== undefined &&
    (!rawPluginSettings ||
      typeof rawPluginSettings !== 'object' ||
      Array.isArray(rawPluginSettings))
  ) {
    return undefined;
  }
  const pluginSettings = (rawPluginSettings ?? {}) as Record<string, unknown>;
  const rawEnvelope = pluginSettings[ONBOARDING_PLUGIN_KEY];
  const envelopeResult = pluginSettingsEnvelopeSchema.safeParse(
    rawEnvelope === undefined
      ? {
          revision: 0,
          contexts: {},
          data: registered.defaults,
        }
      : rawEnvelope,
  );
  if (!envelopeResult.success) return undefined;
  const dataResult = (() => {
    try {
      return registered.schema().safeParse(envelopeResult.data.data);
    } catch {
      return undefined;
    }
  })();
  if (!dataResult?.success) return undefined;
  const data = recordBody(dataResult.data);
  const { optedOut, pausedUntil } = data;
  if (
    typeof optedOut !== 'boolean' ||
    (pausedUntil !== null && typeof pausedUntil !== 'string') ||
    (typeof pausedUntil === 'string' &&
      Number.isNaN(new Date(pausedUntil).getTime()))
  ) {
    return undefined;
  }
  return {
    data: {
      ...data,
      optedOut,
      pausedUntil,
      checkpointPolicy: checkpointPolicyFromData(data),
    },
    envelope:
      rawEnvelope === undefined
        ? { ...envelopeResult.data, data: dataResult.data }
        : envelopeResult.data,
    pluginSettings,
  };
};

export const onboardingDayKey = (
  createdAt: Date,
  now: Date,
  virtualDayDurationMs?: number,
): string => {
  if (virtualDayDurationMs) {
    return String(
      Math.floor((now.getTime() - createdAt.getTime()) / virtualDayDurationMs),
    );
  }
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
};

const nextMessageKind = (
  state: OnboardingGuideState,
  ageDays: number,
  policy: CheckpointPolicy,
): OnboardingProactiveMessageKind | undefined => {
  const completed = state.completedProactiveMessageKinds ?? [];
  if (!completed.includes('intro') && ageDays >= 0) return 'intro';
  if (!completed.includes('soft-door') && ageDays >= 1) return 'soft-door';
  if (!completed.includes('stalled-suggestion') && ageDays >= 3) {
    return 'stalled-suggestion';
  }
  if (policy.progress && !completed.includes('progress') && ageDays >= 5) {
    return 'progress';
  }
  if (policy.openDoor && !completed.includes('open-door') && ageDays >= 7) {
    return 'open-door';
  }
  return undefined;
};

export const resolveWelcomeCandidate = ({
  profile,
  publicProfile,
  chatbot,
  settings,
  config,
  defaultLocale,
  now,
}: {
  profile: ProfileRow;
  publicProfile: PublicProfile;
  chatbot: PublicProfile;
  settings: SettingsRow;
  config: OnboardingGuideConfig;
  defaultLocale: string;
  now: Date;
}): WelcomeCandidate | undefined => {
  const resolvedConfig = resolveOnboardingGuideConfig(config);
  const state = stateFromSettings(settings.body);
  const pluginSettings = onboardingPluginSettingsFromBody(settings.body);
  if (
    !state ||
    !pluginSettings ||
    pluginSettings.data.optedOut ||
    (pluginSettings.data.pausedUntil !== null &&
      new Date(pluginSettings.data.pausedUntil) > now)
  ) {
    return undefined;
  }
  const createdAt = profile.createdAt;
  const createdAtDate = new Date(createdAt);
  if (
    !canSendProactiveDm({
      config: resolvedConfig,
      state,
      createdAt,
      now,
    })
  ) {
    return undefined;
  }
  const ageDays = daysBetween(
    createdAt,
    now,
    resolvedConfig.virtualDayDurationMs,
  );
  const messageKind = nextMessageKind(
    state,
    ageDays,
    pluginSettings.data.checkpointPolicy,
  );
  if (!messageKind) return undefined;
  const suggestedRung = nextMissingRung(
    state.completedRungs ?? [],
    resolvedConfig.enabledRungs,
  );
  const dayKey = onboardingDayKey(
    createdAtDate,
    now,
    resolvedConfig.virtualDayDurationMs,
  );
  const locale = recordBody(settings.body).language;
  return {
    profileId: profile.id,
    profile: publicProfile,
    audience: [publicProfile, chatbot],
    locale: typeof locale === 'string' ? locale : defaultLocale,
    ...(state.guideConversationId
      ? { conversationId: state.guideConversationId }
      : {}),
    config: resolvedConfig,
    state,
    intent: {
      id: `${profile.id}:${messageKind}`,
      messageKind,
      dayKey,
      ...(suggestedRung ? { suggestedRung } : {}),
    },
  };
};

// profile_settings.profile_id is text; profiles.id is uuid.
const settingsBelongToProfile = () =>
  eq(sql`${profiles.id}::text`, profileSettings.profileId);

const candidateRows = (db: PgDb) =>
  db
    .select({
      profile: {
        id: profiles.id,
        handle: profiles.handle,
        body: profiles.body,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      },
      settings: {
        id: profileSettings.id,
        body: profileSettings.body,
      },
    })
    .from(profiles)
    .innerJoin(profileSettings, settingsBelongToProfile())
    .where(and(eq(profiles.type, 'local'), isNull(profiles.deletedAt)))
    .orderBy(asc(profiles.createdAt), asc(profiles.id));

export const listWelcomeCandidates = async (
  config: OnboardingGuideConfig,
  defaultLocale: string,
  now = new Date(),
): Promise<WelcomeCandidate[]> => {
  const chatbotProfile = await findProfileByHandle(
    config.chatbotHandle ?? DEFAULT_CHATBOT_HANDLE,
  );
  if (
    !chatbotProfile ||
    chatbotProfile.type !== 'local' ||
    !chatbotProfile.bot
  ) {
    return [];
  }
  const chatbot = publicProfileSchema.parse(chatbotProfile) as PublicProfile;
  const rows = await candidateRows(await database());
  const candidates = await Promise.all(
    rows
      .filter(({ profile }) => recordBody(profile.body).bot !== true)
      .map(async ({ profile, settings }) => {
        const target = await getPublicProfile(profile.id);
        if (!target) return undefined;
        return resolveWelcomeCandidate({
          profile,
          publicProfile: publicProfileSchema.parse(target) as PublicProfile,
          chatbot,
          settings,
          config,
          defaultLocale,
          now,
        });
      }),
  );
  return candidates.filter(
    (candidate): candidate is WelcomeCandidate => !!candidate,
  );
};

export const recordWelcomeDelivery = (
  state: OnboardingGuideState,
  candidate: WelcomeCandidate,
  {
    postId,
    conversationId,
    now,
  }: { postId: string; conversationId: string; now: Date },
): OnboardingGuideState => {
  const proactiveDayCount =
    state.proactiveDayKey === candidate.intent.dayKey
      ? (state.proactiveDayCount ?? 0) + 1
      : 1;
  return {
    ...state,
    completedProactiveMessageKinds: [
      ...(state.completedProactiveMessageKinds ?? []),
      candidate.intent.messageKind,
    ],
    guideConversationId: conversationId,
    lastProactivePostId: postId,
    lastProactiveAt: now.toISOString(),
    proactiveCount: (state.proactiveCount ?? 0) + 1,
    proactiveDayCount,
    proactiveDayKey: candidate.intent.dayKey,
  };
};

export const recordClaimedWelcomeDelivery = (
  body: unknown,
  candidate: WelcomeCandidate,
  {
    postId,
    conversationId,
    now,
  }: { postId: string; conversationId: string; now: Date },
): Record<string, unknown> | undefined => {
  const plugin = onboardingPluginSettingsFromBody(body);
  if (!plugin) return undefined;
  return {
    ...recordBody(body),
    onboardingGuide: recordWelcomeDelivery(candidate.state, candidate, {
      postId,
      conversationId,
      now,
    }),
    pluginSettings: {
      ...plugin.pluginSettings,
      [ONBOARDING_PLUGIN_KEY]: {
        ...plugin.envelope,
        revision: plugin.envelope.revision + 1,
        contexts: {
          ...plugin.envelope.contexts,
          directMessage: true,
        },
      },
    },
  };
};

const hasSuccessfulDelivery = async ({
  postId,
  conversationId,
  target,
  chatbot,
}: {
  postId: string;
  conversationId: string;
  target: ProfileWithMeta;
  chatbot: ProfileWithMeta;
}): Promise<boolean> => {
  const post = await findPost(postId);
  if (!post || post.visibility !== 'direct' || post.profile.id !== chatbot.id) {
    return false;
  }
  const conversation = await getConversationByEnd(post, {
    profile: target,
    scopes: [],
  });
  return conversation[0]?.id === conversationId;
};

export const claimWelcomeDelivery = async ({
  profileId,
  intentId,
  postId,
  conversationId,
  config,
  defaultLocale,
  now = new Date(),
}: {
  profileId: string;
  intentId: string;
  postId: string;
  conversationId: string;
  config: OnboardingGuideConfig;
  defaultLocale: string;
  now?: Date;
}): Promise<WelcomeCandidate | undefined> => {
  const [target, chatbotProfile] = await Promise.all([
    getPublicProfile(profileId),
    findProfileByHandle(config.chatbotHandle ?? DEFAULT_CHATBOT_HANDLE),
  ]);
  if (
    !target ||
    !chatbotProfile ||
    chatbotProfile.type !== 'local' ||
    !chatbotProfile.bot ||
    !(await hasSuccessfulDelivery({
      postId,
      conversationId,
      target,
      chatbot: chatbotProfile,
    }))
  ) {
    return undefined;
  }
  const publicTarget = publicProfileSchema.parse(target) as PublicProfile;
  const chatbot = publicProfileSchema.parse(chatbotProfile) as PublicProfile;
  return (await database()).transaction(async (tx) => {
    const [row] = await tx
      .select({
        profile: {
          id: profiles.id,
          handle: profiles.handle,
          body: profiles.body,
          createdAt: profiles.createdAt,
          updatedAt: profiles.updatedAt,
        },
        settings: {
          id: profileSettings.id,
          body: profileSettings.body,
        },
      })
      .from(profiles)
      .innerJoin(profileSettings, settingsBelongToProfile())
      .where(
        and(
          eq(profiles.id, profileId),
          eq(profiles.type, 'local'),
          isNull(profiles.deletedAt),
        ),
      )
      .for('update');
    if (!row || recordBody(row.profile.body).bot === true) return undefined;
    const candidate = resolveWelcomeCandidate({
      ...row,
      publicProfile: publicTarget,
      chatbot,
      config,
      defaultLocale,
      now,
    });
    if (
      !candidate ||
      candidate.intent.id !== intentId ||
      (candidate.conversationId && candidate.conversationId !== conversationId)
    ) {
      return undefined;
    }

    const body = recordClaimedWelcomeDelivery(row.settings.body, candidate, {
      postId,
      conversationId,
      now,
    });
    if (!body) return undefined;
    await tx
      .update(profileSettings)
      .set({
        body,
        updatedAt: now.toISOString(),
      })
      .where(eq(profileSettings.id, row.settings.id));
    return candidate;
  });
};
