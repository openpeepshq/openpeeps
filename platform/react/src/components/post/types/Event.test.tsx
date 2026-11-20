/** @vitest-environment jsdom */
import { eventTimeZoneOptions } from '@openpeepshq/common/lib';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedEvent } from './Event';

// Shared UTC instant: 2026-10-05T19:30:00Z reads 15:30 in America/New_York
// and 14:30 in America/Chicago (the #2129 repro values).
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

let mockDisplayTz: string | undefined;
let mockStaticRender: boolean;

vi.mock('../../../hooks/events/useEventDisplayTimeZone', () => ({
  useEventDisplayTimeZone: () => mockDisplayTz,
}));

vi.mock('../../markdown/staticRender', () => ({
  useStaticRender: () => ({
    enabled: mockStaticRender,
  }),
  resolveStaticUrl: (path: string) => path,
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../pieces/EventLocation', () => ({
  EventLocation: () => null,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', null, children),
}));

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const render = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(createElement(FeedEvent, { post }));
  });
};

describe('FeedEvent display timezone (#2129)', () => {
  // Expected wall-clock strings, computed exactly like the component does:
  // same `en-US` locale and the same `eventTimeZoneOptions` option set, so a
  // formatter change on either side fails this file instead of drifting.
  const inTz = (iso: string, tz: string) =>
    new Date(iso).toLocaleString('en-US', eventTimeZoneOptions(tz));

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockStaticRender = false;
    mockDisplayTz = undefined;
    // Device zone differs from both the event and viewer zones.
    process.env.TZ = 'America/Los_Angeles';
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    // Same cleanup as Event.staticRender/Event.integration: the pinned TZ is
    // process-wide, so a leak would make every later date-rendering suite in
    // this vitest worker order-dependent.
    delete process.env.TZ;
  });

  it('renders the feed card clock in the viewer timezone, not the device or event zone', () => {
    // Profile settings win (hook contract), so the card must show the
    // New York wall time even though the event zone is Chicago and the
    // device zone is Los Angeles (the #2129 feed repro).
    mockDisplayTz = 'America/New_York';
    render();
    expect(container?.textContent).toContain(inTz(START, 'America/New_York'));
    expect(container?.textContent).toContain(inTz(END, 'America/New_York'));
    expect(container?.textContent).not.toContain(
      inTz(START, 'America/Chicago'),
    );
    expect(container?.textContent).not.toContain(
      inTz(START, 'America/Los_Angeles'),
    );
    // Calendar-facing shape: a clock time with an AM/PM marker (en-US
    // renders seconds, hence `\d{2}` before the marker), so a formatter
    // change that drops the clock time fails here instead of coincidentally
    // matching the date part.
    expect(container?.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)/);
  });

  it('shows the in-your-timezone suffix only when the display zone differs from the event zone', () => {
    mockDisplayTz = 'America/New_York';
    render();
    expect(container?.textContent).toContain('in your time zone');

    act(() => {
      mockDisplayTz = 'America/Chicago';
      root?.render(createElement(FeedEvent, { post }));
    });
    expect(container?.textContent).not.toContain('in your time zone');
  });
});
