/** @vitest-environment jsdom */
/**
 * Integration render for #2129 (round-2 review suggestion 2): `Event.test.tsx`
 * mocks `useEventDisplayTimeZone` wholesale, so the real resolution chain
 * (profile settings -> community default -> event zone) is never exercised
 * against the component. This suite mounts `FeedEvent` with the real hook
 * and the real `IdentityContext` / `ServerDataContext` / `StaticRenderContext`
 * providers (no hook mocks) and pins the documented tier order on the
 * rendered wall time, so a future change to the fallback order cannot
 * silently regress it.
 */
import type { ProfileSettings } from '@openpeepshq/common';
import { eventTimeZoneOptions } from '@openpeepshq/common/lib';
import type { ReactElement } from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nContext, type I18nContextValue } from '../../../i18n/context';
import { IdentityContext } from '../../layout/IdentityContext';
import { ServerDataContext } from '../../server-data';
import type { ServerDataContextValue } from '../../server-data';
import { StaticRenderContext } from '../../markdown/staticRender';
import { FeedEvent } from './Event';

// Shared UTC instant: 2026-10-05T19:30:00Z reads 15:30 in America/New_York,
// 14:30 in America/Chicago and 12:30 in America/Los_Angeles.
const START = '2026-10-05T19:30:00Z';
const END = '2026-10-05T20:30:00Z';
const post = {
  id: 'p1',
  data: {
    type: 'event',
    name: 'Office Hours',
    start: START,
    end: END,
    wholeDay: false,
    timeZone: 'America/Chicago',
  },
} as never;

const t = (key: string, opts?: { defaultValue?: string }) =>
  opts?.defaultValue ?? key;

const i18nValue = { i18n: null as never, t } as unknown as I18nContextValue;

let mockProfileSettings: ProfileSettings | undefined;
let mockCommunityDefault: string | undefined;

const settings = (timeZone?: string): ProfileSettings | undefined =>
  timeZone ? ({ timeZone } as ProfileSettings) : undefined;

const serverData = (): ServerDataContextValue | null =>
  mockCommunityDefault
    ? ({
        serverInfo: {
          communityConfig: {
            settings: { defaultTimeZone: mockCommunityDefault },
          },
        },
      } as unknown as ServerDataContextValue)
    : null;

/**
 * One canonical provider tree (the file's header pins this nesting order as
 * the contract); `tree` takes the post so every case reuses this exact
 * nesting instead of inlining a second copy of it.
 */
const tree = (node: ReactElement = createElement(FeedEvent, { post })) =>
  createElement(
    I18nContext.Provider,
    { value: i18nValue },
    createElement(
      IdentityContext.Provider,
      { value: { profileSettings: mockProfileSettings } },
      createElement(
        StaticRenderContext.Provider,
        { value: { enabled: false } },
        createElement(
          ServerDataContext.Provider,
          { value: serverData() },
          node,
        ),
      ),
    ),
  );

const render = (node: ReactElement = tree()) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return { root, container };
};

// Format expectations exactly like the component does (same `en-US` locale
// and the same `eventTimeZoneOptions` option set `fmtRange` uses), so the
// string comparison is locale-stable across workers — not dependent on the
// CI image's default locale. A formatter change on either side fails here.
const inTz = (iso: string, tz: string) =>
  new Date(iso).toLocaleString('en-US', eventTimeZoneOptions(tz));

const textOf = (container: HTMLDivElement | undefined): string =>
  container?.textContent ?? '';

const unmount = (root: Root, container: HTMLDivElement) => {
  act(() => root.unmount());
  container.remove();
};

describe('FeedEvent real hook chain (#2129)', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockProfileSettings = undefined;
    mockCommunityDefault = undefined;
    // Device zone differs from every zone asserted below.
    process.env.TZ = 'America/Los_Angeles';
  });

  afterEach(() => {
    delete process.env.TZ;
  });

  it('tier 1: renders in the profile settings zone (beats community + event + device)', () => {
    mockProfileSettings = settings('America/New_York');
    mockCommunityDefault = 'Europe/Berlin';
    const { root, container } = render();
    try {
      const text = textOf(container);
      expect(text).toContain(inTz(START, 'America/New_York'));
      expect(text).not.toContain(inTz(START, 'Europe/Berlin'));
      expect(text).not.toContain(inTz(START, 'America/Chicago'));
      expect(text).not.toContain(inTz(START, 'America/Los_Angeles'));
    } finally {
      unmount(root, container);
    }
  });

  it('tier 2: uses the community default when the profile has no zone', () => {
    mockCommunityDefault = 'Europe/Berlin';
    const { root, container } = render();
    try {
      const text = textOf(container);
      expect(text).toContain(inTz(START, 'Europe/Berlin'));
      expect(text).not.toContain(inTz(START, 'America/Chicago'));
    } finally {
      unmount(root, container);
    }
  });

  it('profile zone equal to the community default still beats the event zone', () => {
    // When tier 1 and tier 2 resolve to the same zone, the chain must
    // still render in that zone and differ from the event zone (and the
    // viewer suffix must show) — the priority chain, not just "tier 1
    // won", is what is pinned here.
    mockProfileSettings = settings('Europe/Berlin');
    mockCommunityDefault = 'Europe/Berlin';
    const { root, container } = render();
    try {
      const text = textOf(container);
      expect(text).toContain(inTz(START, 'Europe/Berlin'));
      expect(text).not.toContain(inTz(START, 'America/Chicago'));
      expect(text).toContain('in your time zone');
    } finally {
      unmount(root, container);
    }
  });

  it('tier 3: falls back to the event zone with no viewer settings', () => {
    const { root, container } = render();
    try {
      const text = textOf(container);
      expect(text).toContain(inTz(START, 'America/Chicago'));
      expect(text).not.toContain(inTz(START, 'America/Los_Angeles'));
    } finally {
      unmount(root, container);
    }
  });

  it('renders the device zone without a suffix when the event zone is invalid', () => {
    // An invalid IANA event zone never resolves: the hook returns
    // `undefined`, the formatters fall through to the device zone, and no
    // "in your time zone" suffix is shown (the resolved zone is not a
    // viewer zone).
    const badZonePost = {
      id: 'p1',
      data: {
        type: 'event',
        name: 'Office Hours',
        start: START,
        end: END,
        wholeDay: false,
        timeZone: 'Not/AZone',
      },
    } as never;
    const { root, container } = render(
      tree(createElement(FeedEvent, { post: badZonePost })),
    );
    try {
      const text = container.textContent ?? '';
      expect(text).toContain(inTz(START, 'America/Los_Angeles'));
      expect(text).not.toContain('in your time zone');
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('shows the in-your-timezone suffix only when the resolved zone differs from the event zone', () => {
    mockProfileSettings = settings('America/New_York');
    const { root, container } = render();
    try {
      expect(textOf(container)).toContain('in your time zone');
      // Re-render the same root with the profile moved to the event zone:
      // the suffix must disappear.
      mockProfileSettings = settings('America/Chicago');
      act(() => {
        root.render(tree());
      });
      expect(textOf(container)).not.toContain('in your time zone');
    } finally {
      unmount(root, container);
    }
  });
});
