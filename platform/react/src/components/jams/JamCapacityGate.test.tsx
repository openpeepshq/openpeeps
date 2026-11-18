/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PublicPost } from '@openpeepshq/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamCapacityGate } from './JamCapacityGate';

vi.mock('./JamGuestForm', () => ({
  JamGuestForm: () => createElement('form', { 'data-testid': 'guest-form' }),
}));

vi.mock('../layout/IdentityContext', () => ({
  useCurrentProfile: () => undefined,
}));

vi.mock('../../i18n', () => ({
  useT: () => (_key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}));

vi.mock('../post/pieces/EventRsvpButton', () => ({
  EventRsvpButton: () => null,
}));

const jamPost = {
  id: 'post',
  data: { type: 'event' },
} as unknown as PublicPost;

describe('JamCapacityGate', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const render = (node: ReactNode) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(node);
    });
  };

  it('shows the guest pass form to a signed-out visitor on a waiting-room jam', () => {
    render(
      createElement(JamCapacityGate, {
        jamPost,
        reason: 'guest-required',
        eventName: 'Waiting room jam',
      }),
    );
    expect(
      container?.querySelector('[data-testid="guest-form"]'),
    ).not.toBeNull();
    // The "view event" / rsvp message block must not also render.
    expect(container?.textContent).not.toContain('This event is full.');
  });

  it('still shows the rsvp/full message for a non-guest block reason', () => {
    render(
      createElement(JamCapacityGate, {
        jamPost,
        reason: 'full',
        eventName: 'Full jam',
      }),
    );
    expect(container?.querySelector('[data-testid="guest-form"]')).toBeNull();
    expect(container?.textContent).toContain('This event is full.');
  });
});
