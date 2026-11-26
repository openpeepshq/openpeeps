/** @vitest-environment jsdom */
/**
 * EventRsvpButton "ended" label suppression (issue #2201).
 *
 * Web parity mirror of the RN test of the same name: when the event's
 * schedule says it ended, the "This event has ended." label renders unless
 * the event's jam is currently in session (jamActive), and the RSVP status
 * text above it is preserved in both cases. The policy lives in the shared
 * useEventRsvp hook, mocked here so the component-level gating is the unit
 * under test.
 */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';

const mockHook = {
  rsvpClosed: true,
  viewedEnded: false,
  myRsvp: undefined as
    | { response: 'yes' | 'tentative' | 'no' | 'waitlist' }
    | undefined,
};

vi.mock('../../../hooks/events/useEventRsvp', () => ({
  useEventRsvp: (args: { jamActive?: boolean }) => ({
    profile: { id: 'viewer-1' },
    myEvent: false,
    myRsvp: mockHook.myRsvp,
    canRsvp: true,
    rsvpClosed: mockHook.rsvpClosed,
    showEndedLabel: mockHook.rsvpClosed && !args.jamActive,
    // Mirror the hook's schedule/viewed-only policy: a live jam suppresses
    // the ended label but must not unhide the RSVP block.
    hideRsvpButton: mockHook.rsvpClosed || mockHook.viewedEnded,
    recurring: false,
    defaultId: undefined,
    occurrences: [],
    capacityEvent: false,
    full: false,
    onWaitlist: false,
    offerExpiresAt: undefined,
    error: null,
    pending: null,
    setPending: vi.fn(),
    confirmingWaitlist: false,
    setConfirmingWaitlist: vi.fn(),
    submitting: false,
    requestRespond: vi.fn(),
    requestJoinWaitlist: vi.fn(),
    confirmJoinWaitlist: vi.fn(),
    claimSpot: vi.fn(),
    confirmScope: vi.fn(),
  }),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: { children?: ReactNode }) =>
    props.children ? createElement('span', null, props.children) : null,
}));

vi.mock('./EventRsvpScopeDialog', () => ({
  EventRsvpScopeDialog: () => null,
}));

vi.mock('./EventWaitlistJoinDialog', () => ({
  EventWaitlistJoinDialog: () => null,
}));

import { EventRsvpButton } from './EventRsvpButton';

const post = { id: 'post-1' } as unknown as PublicPost;

const ENDED = 'This event has ended.';
const ATTENDING = 'You are attending.';

describe('EventRsvpButton ended label', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockHook.rsvpClosed = true;
    mockHook.viewedEnded = false;
    mockHook.myRsvp = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (jamActive?: boolean) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(EventRsvpButton, { post, jamActive }));
    });
    return container;
  };

  it('renders the ended label when the schedule is over and no jam is live', () => {
    render(false);
    expect(container!.innerHTML).toContain(ENDED);
  });

  it('hides the ended label while a jam session is active', () => {
    render(true);
    expect(container!.innerHTML).not.toContain(ENDED);
  });

  it('keeps the attending status text while a jam session is active', () => {
    mockHook.myRsvp = { response: 'yes' };
    render(true);
    expect(container!.innerHTML).toContain(ATTENDING);
    expect(container!.innerHTML).not.toContain(ENDED);
  });

  it('shows both the status text and the ended label when no jam is live', () => {
    mockHook.myRsvp = { response: 'yes' };
    render(false);
    expect(container!.innerHTML).toContain(ATTENDING);
    expect(container!.innerHTML).toContain(ENDED);
  });

  it('series home: hides the button when the first start passed, jam live or not', () => {
    mockHook.rsvpClosed = false;
    mockHook.viewedEnded = true;
    render(false);
    expect(container!.innerHTML).toBe('');
    render(true);
    expect(container!.innerHTML).toBe('');
  });
});
