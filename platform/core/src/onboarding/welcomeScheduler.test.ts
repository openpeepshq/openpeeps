import { resolveOnboardingGuideConfig } from '@openpeepshq/common';
import type { PublicProfile } from '@openpeepshq/common/types';
import { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  onboardingDayKey,
  recordClaimedWelcomeDelivery,
  recordWelcomeDelivery,
  resolveWelcomeCandidate,
} from './welcomeScheduler';

const { getProfileSettingsSchema } = vi.hoisted(() => ({
  getProfileSettingsSchema: vi.fn(),
}));

vi.mock('../plugins', () => ({ getProfileSettingsSchema }));

const pluginDataSchema = z
  .object({
    hidden: z.boolean().default(false),
    pausedUntil: z.string().datetime({ offset: true }).nullable().default(null),
    optedOut: z.boolean().default(false),
    dockDismissed: z.boolean().default(false),
    checkpointPolicy: z
      .object({
        progress: z.boolean().default(true),
        openDoor: z.boolean().default(true),
      })
      .strict()
      .default({ progress: true, openDoor: true }),
  })
  .strict();
const pluginDefaults = pluginDataSchema.parse({});
const pluginKey = 'allpeep/peeps-onboarding';

const profile = {
  id: '00000000-0000-4000-8000-000000000001',
  handle: 'new-member',
  body: { displayName: 'New Member' },
  createdAt: '2026-08-25T12:00:00.000Z',
  updatedAt: '2026-08-25T12:00:00.000Z',
};

const publicProfile: PublicProfile = {
  id: profile.id,
  type: 'local',
  handle: profile.handle,
  displayName: 'New Member',
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
};

const chatbot: PublicProfile = {
  id: '00000000-0000-4000-8000-000000000003',
  type: 'local',
  handle: 'chatbot',
  bot: true,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
};

const settings = {
  id: '00000000-0000-4000-8000-000000000002',
  body: { language: 'fr' },
};

describe('resolveWelcomeCandidate', () => {
  beforeEach(() => {
    getProfileSettingsSchema.mockReturnValue({
      schema: () => pluginDataSchema,
      defaults: pluginDefaults,
    });
  });

  const config = resolveOnboardingGuideConfig({
    quietHours: { startHour: 0, endHour: 0 },
    virtualDayDurationMs: 300_000,
  });
  const resolve = (
    now: string,
    state: Record<string, unknown> = {},
    candidateConfig = config,
    body: Record<string, unknown> = settings.body,
  ) =>
    resolveWelcomeCandidate({
      profile,
      publicProfile,
      chatbot,
      settings: {
        ...settings,
        body: { ...body, onboardingGuide: state },
      },
      config: candidateConfig,
      defaultLocale: 'en',
      now: new Date(now),
    });

  it('fails closed when the plugin schema is not registered', () => {
    getProfileSettingsSchema.mockReturnValue(undefined);
    expect(resolve('2026-08-25T12:00:30.000Z')).toBeUndefined();
  });

  it('uses plugin defaults when no envelope is stored', () => {
    expect(resolve('2026-08-25T12:00:30.000Z')?.intent.messageKind).toBe(
      'intro',
    );
  });

  it('fails closed when stored plugin data is invalid', () => {
    expect(
      resolve('2026-08-25T12:00:30.000Z', {}, config, {
        pluginSettings: {
          [pluginKey]: {
            revision: 2,
            contexts: { directMessage: false },
            data: { optedOut: 'no' },
          },
        },
      }),
    ).toBeUndefined();
  });

  it('suppresses members who opted out through plugin settings', () => {
    expect(
      resolve('2026-08-25T12:00:30.000Z', {}, config, {
        pluginSettings: {
          [pluginKey]: {
            revision: 2,
            contexts: { directMessage: false },
            data: { ...pluginDefaults, optedOut: true },
          },
        },
      }),
    ).toBeUndefined();
  });

  it('suppresses members while plugin settings are paused', () => {
    expect(
      resolve('2026-08-25T12:00:30.000Z', {}, config, {
        pluginSettings: {
          [pluginKey]: {
            revision: 2,
            contexts: { directMessage: false },
            data: {
              ...pluginDefaults,
              pausedUntil: '2026-08-25T12:01:00.000Z',
            },
          },
        },
      }),
    ).toBeUndefined();
  });

  it('returns an authoritative intro immediately', () => {
    expect(resolve('2026-08-25T12:00:30.000Z')).toMatchObject({
      profileId: profile.id,
      profile: publicProfile,
      audience: [publicProfile, chatbot],
      locale: 'fr',
      intent: {
        id: `${profile.id}:intro`,
        messageKind: 'intro',
        dayKey: '0',
      },
    });
  });

  it('returns soft-door at virtual day one', () => {
    expect(
      resolve('2026-08-25T12:05:00.000Z', {
        completedProactiveMessageKinds: ['intro'],
        lastProactiveAt: '2026-08-25T12:00:30.000Z',
        proactiveDayCount: 1,
      })?.intent,
    ).toMatchObject({
      id: `${profile.id}:soft-door`,
      messageKind: 'soft-door',
      dayKey: '1',
    });
  });

  it('returns stalled-suggestion at virtual day three', () => {
    expect(
      resolve('2026-08-25T12:15:00.000Z', {
        completedProactiveMessageKinds: ['intro', 'soft-door'],
        lastProactiveAt: '2026-08-25T12:05:00.000Z',
        proactiveDayCount: 1,
        guideConversationId: 'conversation-1',
      }),
    ).toMatchObject({
      conversationId: 'conversation-1',
      intent: {
        id: `${profile.id}:stalled-suggestion`,
        messageKind: 'stalled-suggestion',
        dayKey: '3',
      },
    });
  });

  it('suppresses a follow-up in the same virtual bucket', () => {
    expect(
      resolve('2026-08-25T12:04:59.000Z', {
        completedProactiveMessageKinds: ['intro'],
        lastProactiveAt: '2026-08-25T12:00:30.000Z',
        proactiveDayCount: 1,
      }),
    ).toBeUndefined();
  });

  it('uses equivalent real-day thresholds without virtual timing', () => {
    const productionConfig = resolveOnboardingGuideConfig({
      quietHours: { startHour: 0, endHour: 0 },
    });
    expect(
      resolve(
        '2026-08-26T12:00:00.000Z',
        { completedProactiveMessageKinds: ['intro'] },
        productionConfig,
      )?.intent.messageKind,
    ).toBe('soft-door');
    expect(
      resolve(
        '2026-08-28T12:00:00.000Z',
        {
          completedProactiveMessageKinds: ['intro', 'soft-door'],
        },
        productionConfig,
      )?.intent.messageKind,
    ).toBe('stalled-suggestion');
    expect(
      resolve(
        '2026-08-30T12:00:00.000Z',
        {
          completedProactiveMessageKinds: [
            'intro',
            'soft-door',
            'stalled-suggestion',
          ],
        },
        productionConfig,
      )?.intent.messageKind,
    ).toBe('progress');
    expect(
      resolve(
        '2026-09-01T12:00:00.000Z',
        {
          completedProactiveMessageKinds: [
            'intro',
            'soft-door',
            'stalled-suggestion',
            'progress',
          ],
        },
        productionConfig,
      )?.intent.messageKind,
    ).toBe('open-door');
  });

  it('returns progress at virtual day five when the member is stalled', () => {
    expect(
      resolve('2026-08-25T12:25:00.000Z', {
        completedProactiveMessageKinds: [
          'intro',
          'soft-door',
          'stalled-suggestion',
        ],
        lastProactiveAt: '2026-08-25T12:15:00.000Z',
        proactiveDayCount: 1,
      })?.intent,
    ).toMatchObject({
      id: `${profile.id}:progress`,
      messageKind: 'progress',
      dayKey: '5',
    });
  });

  it('returns open-door at virtual day seven after the progress nudge', () => {
    expect(
      resolve('2026-08-25T12:35:00.000Z', {
        completedProactiveMessageKinds: [
          'intro',
          'soft-door',
          'stalled-suggestion',
          'progress',
        ],
        lastProactiveAt: '2026-08-25T12:25:00.000Z',
        proactiveDayCount: 1,
      })?.intent,
    ).toMatchObject({
      id: `${profile.id}:open-door`,
      messageKind: 'open-door',
      dayKey: '7',
    });
  });

  it('skips progress when plugin checkpoint policy disables it', () => {
    expect(
      resolve(
        '2026-08-25T12:25:00.000Z',
        {
          completedProactiveMessageKinds: [
            'intro',
            'soft-door',
            'stalled-suggestion',
          ],
          lastProactiveAt: '2026-08-25T12:15:00.000Z',
          proactiveDayCount: 1,
        },
        config,
        {
          ...settings.body,
          pluginSettings: {
            [pluginKey]: {
              revision: 2,
              contexts: { directMessage: false },
              data: {
                ...pluginDefaults,
                checkpointPolicy: { progress: false, openDoor: true },
              },
            },
          },
        },
      ),
    ).toBeUndefined();
    expect(
      resolve(
        '2026-08-25T12:35:00.000Z',
        {
          completedProactiveMessageKinds: [
            'intro',
            'soft-door',
            'stalled-suggestion',
          ],
          lastProactiveAt: '2026-08-25T12:15:00.000Z',
          proactiveDayCount: 1,
        },
        config,
        {
          ...settings.body,
          pluginSettings: {
            [pluginKey]: {
              revision: 2,
              contexts: { directMessage: false },
              data: {
                ...pluginDefaults,
                checkpointPolicy: { progress: false, openDoor: true },
              },
            },
          },
        },
      )?.intent.messageKind,
    ).toBe('open-door');
  });

  it('records post-success state and rejects the completed intent on restart', () => {
    const intro = resolve('2026-08-25T12:00:30.000Z')!;
    const recorded = recordWelcomeDelivery(intro.state, intro, {
      postId: 'post-1',
      conversationId: 'conversation-1',
      now: new Date('2026-08-25T12:00:30.000Z'),
    });
    expect(recorded).toMatchObject({
      completedProactiveMessageKinds: ['intro'],
      guideConversationId: 'conversation-1',
      lastProactivePostId: 'post-1',
      proactiveCount: 1,
      proactiveDayCount: 1,
    });
    const afterRestart = resolve('2026-08-25T12:05:00.000Z', recorded);
    expect(afterRestart?.intent).toMatchObject({
      id: `${profile.id}:soft-door`,
      messageKind: 'soft-door',
    });
    expect(afterRestart?.intent.id).not.toBe(intro.intent.id);
  });

  it('records delivery and activates plugin context in one settings body', () => {
    const pluginData = {
      ...pluginDefaults,
      hidden: true,
    };
    const otherPlugin = {
      revision: 9,
      contexts: { directMessage: false },
      data: { retained: true },
    };
    const body = {
      language: 'fr',
      pluginSettings: {
        [pluginKey]: {
          revision: 4,
          contexts: { directMessage: false },
          data: pluginData,
        },
        'other/plugin': otherPlugin,
      },
    };
    const candidate = resolve('2026-08-25T12:00:30.000Z', {}, config, body)!;
    const updated = recordClaimedWelcomeDelivery(body, candidate, {
      postId: 'post-1',
      conversationId: 'conversation-1',
      now: new Date('2026-08-25T12:00:30.000Z'),
    });

    expect(updated).toMatchObject({
      onboardingGuide: {
        completedProactiveMessageKinds: ['intro'],
        guideConversationId: 'conversation-1',
      },
    });
    expect(updated?.pluginSettings).toEqual({
      [pluginKey]: {
        revision: 5,
        contexts: { directMessage: true },
        data: pluginData,
      },
      'other/plugin': otherPlugin,
    });
  });

  it('fails closed when persisted onboarding state is malformed', () => {
    expect(
      resolve('2026-08-25T12:05:00.000Z', {
        status: 'caller-controlled',
      }),
    ).toBeUndefined();
  });
});

describe('onboardingDayKey', () => {
  it('keeps calendar dates without demo timing', () => {
    expect(
      onboardingDayKey(
        new Date(profile.createdAt),
        new Date('2026-08-26T01:00:00.000Z'),
      ),
    ).toBe('2026-08-26');
  });
});
