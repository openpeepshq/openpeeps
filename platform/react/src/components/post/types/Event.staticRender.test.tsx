/** @vitest-environment jsdom */
/**
 * Email/static-render regression for #2129 (round-2 review suggestion 1):
 * notification emails render `FeedPostContent` under `StaticRenderContext`
 * and `I18nContext` only — none of the in-app providers (`IdentityContext`,
 * `ServerDataProvider`, …) are mounted. The display-timezone hook must not
 * require a provider: in static renders it degrades to the event zone while
 * the static branch formats the range with the recipient's zone from the
 * static-render context.
 *
 * Before the static-render guard, `FeedEvent` called `useServerInfo`
 * unconditionally and threw `useServerData must be used inside
 * <ServerDataProvider>` here, crashing the server email suites (Rsvp,
 * NewGroupPost) on a fresh `@openpeepshq/react` build.
 */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatEventWhen } from '@openpeepshq/common/lib';
import { I18nContext, type I18nContextValue } from '../../../i18n/context';
import { StaticRenderContext } from '../../markdown/staticRender';
import { FeedEvent } from './Event';

// Shared UTC instant: 2026-10-05T19:30:00Z reads 19:30 UTC, 15:30 in
// America/New_York and 14:30 in America/Chicago.
const START = '2026-10-05T19:30:00Z';
const END = '2026-10-05T20:30:00Z';
const BASE_URL = 'https://example.com';
const post = {
  id: 'p1',
  data: {
    type: 'event',
    name: 'Office Hours',
    start: START,
    end: END,
    wholeDay: false,
    timeZone: 'America/Chicago',
    physicalLocation: {
      text: '500 Fifth Avenue, New York',
      latitude: 40.758,
      longitude: -73.985,
    },
  },
} as never;

const i18nContext = {
  i18n: null as never,
  t: (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
} as unknown as I18nContextValue;

// Mirrors the email embed: StaticRenderContext only — no identity/server
// providers. I18nContext is the minimum the text renderers need.
const render = (timeZone: string) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(
        StaticRenderContext.Provider,
        { value: { enabled: true, baseUrl: BASE_URL, timeZone } },
        createElement(
          I18nContext.Provider,
          { value: i18nContext },
          createElement(FeedEvent, { post }),
        ),
      ),
    );
  });
  return { root, container };
};

describe('FeedEvent static render (email path, #2129)', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    // Device zone differs from both asserted zones.
    process.env.TZ = 'America/Los_Angeles';
  });

  afterEach(() => {
    delete process.env.TZ;
  });

  it('renders without in-app providers (no ServerDataProvider crash)', () => {
    const { root, container } = render('UTC');
    try {
      expect(container.textContent).toContain('Office Hours');
      // The static range is formatted in the static-render context zone.
      expect(container.textContent).toContain(
        formatEventWhen(START, { end: END, timeZone: 'UTC', allDay: false }),
      );
      expect(container.textContent).not.toContain(
        formatEventWhen(START, {
          end: END,
          timeZone: 'America/Chicago',
          allDay: false,
        }),
      );
      // View link rewritten to the absolute email URL.
      expect(container.querySelector('a[href]')?.getAttribute('href')).toBe(
        `${BASE_URL}/posts/p1`,
      );
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
