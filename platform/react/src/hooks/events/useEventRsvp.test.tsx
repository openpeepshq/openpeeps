/** @vitest-environment jsdom */
/**
 * useEventRsvp ended-label policy (issue #2201).
 *
 * Pins the contract in the shared hook: `showEndedLabel` is true only when
 * the schedule says the event ended AND no jam session is active, and
 * `rsvpClosed` stays schedule-locked (a live jam must not reopen RSVPs).
 * `hideRsvpButton` stays schedule/viewed-only: a live jam must not unhide
 * the RSVP block while the write guards still no-op on it.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { useEventRsvp } from './useEventRsvp';

const mockCommon = {
  rsvpOpen: false,
  occurrenceEnded: true,
};

vi.mock('@openpeepshq/common/lib', () => ({
  canClaimYesRsvp: () => false,
  checkPostCapabilities: () => ({ success: true }),
  defaultRsvpRecurrenceId: () => undefined,
  displayRsvpForProfile: () => undefined,
  effectiveEventTimes: (event: { start: string; end: string }) => ({
    start: event.start,
    end: event.end,
  }),
  eventRsvpOpen: () => mockCommon.rsvpOpen,
  isCapacityEvent: () => false,
  isRecurringEvent: () => false,
  listRsvpOccurrences: () => [],
  occurrenceHasEnded: () => mockCommon.occurrenceEnded,
  offerStillOpen: () => false,
  seriesHasClaimableOccurrence: () => false,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: { rsvpToEventAction: () => ({}) },
  }),
}));

vi.mock('../../i18n/context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('../../lib/apiErrorMessage', () => ({
  apiErrorMessage: (err: unknown) => String(err),
}));

vi.mock('../../components/layout/IdentityContext', () => ({
  useAuthData: () => undefined,
  useCurrentProfile: () => ({ id: 'viewer-1' }),
}));

vi.mock('../../components/server-data', () => ({
  useCapabilities: () => undefined,
}));

const post = {
  id: 'post-1',
  profile: { id: 'organizer-1' },
  data: {
    type: 'event',
    start: '2026-11-01T09:00:00.000Z',
    end: '2026-11-01T17:00:00.000Z',
  },
} as unknown as PublicPost;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let captured: ReturnType<typeof useEventRsvp> | undefined;
let currentJamActive: boolean | undefined;

const Host = () => {
  captured = useEventRsvp({ post, jamActive: currentJamActive });
  return null;
};

const renderHost = (jamActive?: boolean) => {
  currentJamActive = jamActive;
  act(() => {
    root?.render(createElement(Host));
  });
};

describe('useEventRsvp ended label vs live jam', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockCommon.rsvpOpen = false;
    mockCommon.occurrenceEnded = true;
    currentJamActive = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured = undefined;
  });

  it('shows the ended label when the schedule ended and no jam is live', () => {
    renderHost(undefined);
    expect(captured!.rsvpClosed).toBe(true);
    expect(captured!.showEndedLabel).toBe(true);
  });

  it('hides the ended label while a jam session is active', () => {
    renderHost(undefined);
    renderHost(true);
    expect(captured!.showEndedLabel).toBe(false);
  });

  it('keeps RSVPs closed while a jam session is active', () => {
    renderHost(undefined);
    renderHost(true);
    expect(captured!.rsvpClosed).toBe(true);
  });

  it('series home: the viewed-ended hide stays in effect while a jam is live (no dead controls)', () => {
    // Series home: the occurrence is open on the schedule (rsvpClosed
    // false) but the first start has passed (viewedEnded true). The write
    // guards stay schedule-locked, so a live jam must not unhide the block
    // either: it would render Register/Maybe buttons that silently no-op.
    mockCommon.rsvpOpen = true;
    renderHost(undefined);
    expect(captured!.hideRsvpButton).toBe(true);
    renderHost(true);
    expect(captured!.hideRsvpButton).toBe(true);
    expect(captured!.showEndedLabel).toBe(false);
  });
});
