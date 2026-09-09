import { describe, expect, it } from 'vitest';
import {
  canSendProactiveDm,
  isQuietHour,
  isSameLocalDay,
  nextMissingRung,
  resolveOnboardingGuideConfig,
  shouldAutoOpenDock,
  shouldShowFab,
  withDismissal,
  withMute,
  withSnooze,
} from '../onboardingGuide';

const noon = (isoDate: string) => new Date(`${isoDate}T12:00:00`);

describe('isQuietHour', () => {
  it('wraps overnight quiet hours', () => {
    const hours = { startHour: 21, endHour: 8 };
    expect(isQuietHour(new Date('2026-08-25T22:00:00'), hours)).toBe(true);
    expect(isQuietHour(new Date('2026-08-25T07:00:00'), hours)).toBe(true);
    expect(isQuietHour(new Date('2026-08-25T12:00:00'), hours)).toBe(false);
  });

  it('handles a same-day window', () => {
    const hours = { startHour: 9, endHour: 17 };
    expect(isQuietHour(new Date('2026-08-25T10:00:00'), hours)).toBe(true);
    expect(isQuietHour(new Date('2026-08-25T08:00:00'), hours)).toBe(false);
  });
});

describe('shouldAutoOpenDock', () => {
  const config = resolveOnboardingGuideConfig();
  const createdAt = '2026-08-20T10:00:00.000Z';

  it('opens once for a new member during the day', () => {
    expect(
      shouldAutoOpenDock({
        config,
        state: { status: 'active', proactive: true },
        createdAt,
        now: noon('2026-08-25'),
      }),
    ).toBe(true);
  });

  it('does not reopen after the dock was shown', () => {
    expect(
      shouldAutoOpenDock({
        config,
        state: {
          status: 'active',
          proactive: true,
          dockShownAt: '2026-08-24T10:00:00.000Z',
        },
        createdAt,
        now: noon('2026-08-25'),
      }),
    ).toBe(false);
  });

  it('stays closed during quiet hours', () => {
    expect(
      shouldAutoOpenDock({
        config,
        state: { status: 'active', proactive: true },
        createdAt,
        now: new Date('2026-08-25T22:30:00'),
      }),
    ).toBe(false);
  });
});

describe('canSendProactiveDm', () => {
  const config = resolveOnboardingGuideConfig();

  it('caps at one DM per local day', () => {
    expect(
      canSendProactiveDm({
        config,
        state: {
          status: 'active',
          proactive: true,
          lastProactiveAt: '2026-08-25T08:00:00.000Z',
          proactiveCount: 1,
        },
        createdAt: '2026-08-20T10:00:00.000Z',
        now: noon('2026-08-25'),
      }),
    ).toBe(false);
  });

  it('stops after the window cap', () => {
    expect(
      canSendProactiveDm({
        config,
        state: {
          status: 'active',
          proactive: true,
          proactiveCount: 5,
        },
        createdAt: '2026-08-20T10:00:00.000Z',
        now: noon('2026-08-25'),
      }),
    ).toBe(false);
  });

  it('respects mute', () => {
    expect(
      canSendProactiveDm({
        config,
        state: { status: 'muted', proactive: false },
        createdAt: '2026-08-20T10:00:00.000Z',
        now: noon('2026-08-25'),
      }),
    ).toBe(false);
  });

  it('suppresses another DM in the same virtual day bucket', () => {
    const virtualConfig = resolveOnboardingGuideConfig({
      virtualDayDurationMs: 300_000,
    });
    expect(
      canSendProactiveDm({
        config: virtualConfig,
        state: {
          status: 'active',
          proactive: true,
          lastProactiveAt: '2026-08-25T12:06:00.000Z',
          proactiveCount: 1,
        },
        createdAt: '2026-08-25T12:00:00.000Z',
        now: new Date('2026-08-25T12:09:00.000Z'),
      }),
    ).toBe(false);
  });

  it('allows an intro during the first virtual day', () => {
    const virtualConfig = resolveOnboardingGuideConfig({
      virtualDayDurationMs: 300_000,
    });
    const input = {
      config: virtualConfig,
      state: { status: 'active' as const, proactive: true },
      createdAt: '2026-08-25T12:00:00.000Z',
    };
    expect(
      canSendProactiveDm({
        ...input,
        now: new Date('2026-08-25T12:04:59.999Z'),
      }),
    ).toBe(true);
    expect(
      canSendProactiveDm({
        ...input,
        now: new Date('2026-08-25T12:05:00.000Z'),
      }),
    ).toBe(true);
  });

  it('keeps immediate calendar-day eligibility when virtual days are absent', () => {
    expect(
      canSendProactiveDm({
        config,
        state: { status: 'active', proactive: true },
        createdAt: '2026-08-25T11:59:59.000Z',
        now: new Date('2026-08-25T12:00:00.000Z'),
      }),
    ).toBe(true);
  });
});

describe('withSnooze', () => {
  it('turns a seven-day demo snooze into 35 minutes', () => {
    const now = new Date('2026-08-25T12:00:00.000Z');
    const state = withSnooze({}, now, 7, 300_000);
    expect(state.snoozedUntil).toBe('2026-08-25T12:35:00.000Z');
    const config = resolveOnboardingGuideConfig({
      quietHours: { startHour: 0, endHour: 0 },
      virtualDayDurationMs: 300_000,
    });
    expect(
      canSendProactiveDm({
        config,
        state,
        createdAt: '2026-08-25T12:00:00.000Z',
        now: new Date('2026-08-25T12:34:59.999Z'),
      }),
    ).toBe(false);
    expect(
      canSendProactiveDm({
        config,
        state,
        createdAt: '2026-08-25T12:00:00.000Z',
        now: new Date('2026-08-25T12:35:00.000Z'),
      }),
    ).toBe(true);
  });

  it('keeps seven calendar days when virtual days are absent', () => {
    const now = new Date('2026-08-25T12:00:00.000Z');
    expect(withSnooze({}, now).snoozedUntil).toBe('2026-09-01T12:00:00.000Z');
  });
});

describe('shouldShowFab', () => {
  it('hides after a forever dismiss', () => {
    const now = noon('2026-08-25');
    const state = withMute({ status: 'active', proactive: true }, now);
    expect(
      shouldShowFab({
        config: resolveOnboardingGuideConfig(),
        state,
        createdAt: '2026-08-20T10:00:00.000Z',
        now,
      }),
    ).toBe(false);
  });
});

describe('nextMissingRung', () => {
  it('returns the earliest enabled rung not completed', () => {
    expect(
      nextMissingRung(['orient'], ['orient', 'join_group', 'say_hello']),
    ).toBe('join_group');
  });
});

describe('withDismissal', () => {
  it('suppresses a surface for seven days', () => {
    const now = noon('2026-08-25');
    const state = withDismissal(
      { status: 'active', proactive: true },
      'feed',
      now,
    );
    expect(state.invitationDismissals?.[0]?.surface).toBe('feed');
  });
});

describe('isSameLocalDay', () => {
  it('compares calendar days', () => {
    expect(
      isSameLocalDay(
        new Date('2026-08-25T01:00:00'),
        new Date('2026-08-25T23:00:00'),
      ),
    ).toBe(true);
    expect(
      isSameLocalDay(
        new Date('2026-08-25T23:00:00'),
        new Date('2026-08-26T01:00:00'),
      ),
    ).toBe(false);
  });
});
