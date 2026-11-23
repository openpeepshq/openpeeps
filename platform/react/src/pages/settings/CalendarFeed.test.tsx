/** @vitest-environment jsdom */
import { act, createElement, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The hook is the unit under test in `useCalendarFeedLink.test.ts`; here it is
// stubbed with a controllable fixture so the page's rendering branches (create
// button, link box, delete button, toasts) are pinned independently. State
// changes are driven by mutating `hookState` and re-rendering, mirroring the
// NotificationPreferences page test.
const { hookState } = vi.hoisted(() => ({
  hookState: {
    feedUrl: undefined as string | undefined,
    creating: false,
    revoking: false,
    status: null as { type: 'success' | 'error'; message: string } | null,
    createLink: (_?: unknown) => undefined as unknown,
    revokeLink: (_?: unknown) => undefined as unknown,
    clearStatus: (_?: unknown) => undefined as unknown,
  },
}));

vi.mock('../../index', () => ({
  useT: () => (key: string, opts?: Record<string, string>) =>
    opts?.defaultValue ?? key,
  useSetPageHeader: () => undefined,
}));

vi.mock('../../hooks', () => ({
  useCalendarFeedLink: () => ({
    feedUrl: hookState.feedUrl,
    creating: hookState.creating,
    revoking: hookState.revoking,
    status: hookState.status,
    clearStatus: () => hookState.clearStatus(),
    createLink: () => hookState.createLink(),
    revokeLink: () => hookState.revokeLink(),
  }),
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: {
    children?: ReactNode;
    action?: () => void;
    disabled?: boolean;
  }) =>
    createElement(
      'button',
      {
        'data-testid': 'ui-button',
        disabled: props.disabled,
        onClick: props.action,
      },
      props.children,
    ),
  Toast: (props: { children?: ReactNode; variant?: 'success' | 'error' }) =>
    createElement(
      'div',
      {
        'data-testid': 'toast',
        role: props.variant === 'error' ? 'alert' : 'status',
      },
      props.children,
    ),
}));

import { CalendarFeedSettings } from './CalendarFeed';

const FEED_URL =
  'https://ap.social/api/openpeeps/core/v1/events/feed?token=abc123';

describe('CalendarFeedSettings (web)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hookState.feedUrl = undefined;
    hookState.creating = false;
    hookState.revoking = false;
    hookState.status = null;
    hookState.createLink = vi.fn(() => Promise.resolve({ token: 'abc123' }));
    hookState.revokeLink = vi.fn(() => Promise.resolve({}));
    hookState.clearStatus = vi.fn();
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
  });

  const render = (element: ReactElement) => {
    act(() => {
      root?.render(element);
    });
  };

  const actionButton = () =>
    container?.querySelector(
      '[data-testid=ui-button]',
    ) as HTMLButtonElement | null;

  it('starts on the create action and pins the intro facts (replace + 90-day expiry)', () => {
    render(createElement(CalendarFeedSettings));
    const button = actionButton();
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Create calendar link');
    expect(button?.disabled).toBe(false);
    // No link box before a link exists.
    expect(container?.querySelector('code')).toBeNull();
    // The intro states both facts the user needs before minting a link.
    expect(container?.textContent).toContain('replaces and revokes');
    expect(container?.textContent).toContain('90 days');
  });

  it('disables the action and shows the creating copy while creating', () => {
    hookState.creating = true;
    render(createElement(CalendarFeedSettings));
    const button = actionButton();
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toBe('Creating…');
  });

  it('shows the disabled deleting copy on the delete action while revoking', () => {
    hookState.feedUrl = FEED_URL;
    hookState.revoking = true;
    render(createElement(CalendarFeedSettings));
    const button = actionButton();
    expect(button?.textContent).toBe('Deleting…');
    expect(button?.disabled).toBe(true);
  });

  it('create flow: clicking create calls the hook action; the rendered link box shows the URL, copy button and delete action', async () => {
    render(createElement(CalendarFeedSettings));
    await act(async () => {
      actionButton()?.click();
    });
    expect(hookState.createLink).toHaveBeenCalledTimes(1);

    hookState.feedUrl = FEED_URL;
    render(createElement(CalendarFeedSettings));
    expect(container?.querySelector('code')?.textContent).toBe(FEED_URL);
    // Exactly one action button now (delete), plus the copy button in the box.
    expect(container?.querySelectorAll('[data-testid=ui-button]')).toHaveLength(
      1,
    );
    const deleteButton = actionButton();
    expect(deleteButton?.textContent).toBe('Delete link');
    expect(deleteButton?.disabled).toBe(false);
    expect(container?.querySelector('button[title="Copy"]')).not.toBeNull();
  });

  it('copy flow: the copy button writes the feed URL to the clipboard', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    hookState.feedUrl = FEED_URL;
    render(createElement(CalendarFeedSettings));
    const copyButton = container?.querySelector(
      'button[title="Copy"]',
    ) as HTMLButtonElement | null;
    expect(copyButton).not.toBeNull();
    await act(async () => {
      copyButton?.click();
    });
    expect(writeText).toHaveBeenCalledWith(FEED_URL);
  });

  it('delete flow: clicking delete calls the hook action; the cleared state returns to create', async () => {
    hookState.feedUrl = FEED_URL;
    render(createElement(CalendarFeedSettings));
    await act(async () => {
      actionButton()?.click();
    });
    expect(hookState.revokeLink).toHaveBeenCalledTimes(1);

    // A successful revoke clears the feed and reports success (the real hook
    // does both; the stub is driven here).
    hookState.feedUrl = undefined;
    hookState.status = { type: 'success', message: 'Calendar link deleted.' };
    render(createElement(CalendarFeedSettings));
    expect(container?.querySelector('code')).toBeNull();
    const toast = container?.querySelector('[data-testid=toast]');
    expect(toast?.textContent).toBe('Calendar link deleted.');
    expect(toast?.getAttribute('role')).toBe('status');
    // Back to the create action.
    expect(actionButton()?.textContent).toBe('Create calendar link');
  });

  it('renders an error status as an alert toast', () => {
    hookState.status = {
      type: 'error',
      message: 'Could not create the calendar link.',
    };
    render(createElement(CalendarFeedSettings));
    const toast = container?.querySelector('[data-testid=toast]');
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.textContent).toBe('Could not create the calendar link.');
  });
});
