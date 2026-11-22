/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PublicPost } from '@openpeepshq/common/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamRoom } from './JamRoom';

const roomStateRef = vi.hoisted(() => ({
  connection: undefined as
    | { token: string; livekitUrl: string; audio: boolean; video: boolean }
    | undefined,
  reconnectPrefs: undefined as { audio: boolean; video: boolean } | undefined,
  removedFromJam: false,
}));

vi.mock('../../hooks/jams/useJamRoom', () => ({
  useJamRoom: () => ({
    me: undefined,
    post: { id: 'post' },
    jamPost: { id: 'post' },
    jamEvent: { name: 'Test jam' },
    observer: false,
    occurrence: undefined,
    livekitEnabled: true,
    connection: roomStateRef.connection,
    reconnectPrefs: roomStateRef.reconnectPrefs,
    reconnectError: undefined,
    observerError: undefined,
    autoRsvpError: undefined,
    shouldAutoRsvp: false,
    capacityBlock: { blocked: false },
    removedFromJam: roomStateRef.removedFromJam,
    canDirectJoin: false,
    canRequestJoin: false,
    handleJoin: () => {},
    handleDisconnected: () => {},
    tryReconnect: () => {},
  }),
}));

vi.mock('./JamContext', () => ({
  JamProvider: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
}));

// Real shipped locale, so the removed-panel copy assertion pins the value
// the user actually sees — a renamed `jams.room.removedFromJam` key breaks.
const en = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../i18n/src/locales/en.json'),
    'utf8',
  ),
) as Record<string, unknown>;
const lookup = (key: string): string | undefined => {
  let cur: unknown = en;
  for (const part of key.split('.')) {
    cur =
      cur && typeof cur === 'object'
        ? (cur as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
};

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    lookup(key) ?? opts?.defaultValue ?? key,
}));

vi.mock('./JamVideoCall', () => ({
  JamVideoCall: () => null,
}));

const jamPost = { id: 'post' } as PublicPost;

const fireBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('JamRoom tab-close warning', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    roomStateRef.connection = undefined;
    roomStateRef.reconnectPrefs = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const newRoot = createRoot(container);
    root = newRoot;
    act(() => {
      newRoot.render(createElement(JamRoom, { jamPost }));
    });
    return { root: newRoot };
  };

  const rerender = (target: Root) => {
    act(() => {
      target.render(createElement(JamRoom, { jamPost }));
    });
  };

  it('does not warn while no jam session exists', () => {
    mount();
    expect(fireBeforeUnload()).toBe(false);
  });

  it('warns while connected and stops after unmount', () => {
    const { root: target } = mount();
    expect(fireBeforeUnload()).toBe(false);

    roomStateRef.connection = {
      token: 'token',
      livekitUrl: 'url',
      audio: true,
      video: true,
    };
    rerender(target);
    expect(fireBeforeUnload()).toBe(true);

    act(() => {
      target.unmount();
    });
    expect(fireBeforeUnload()).toBe(false);
  });

  it('warns while the app-level reconnect view is showing', () => {
    const { root: target } = mount();

    roomStateRef.reconnectPrefs = { audio: true, video: true };
    rerender(target);
    expect(fireBeforeUnload()).toBe(true);
  });

  it('stops warning once the session ends', () => {
    const { root: target } = mount();

    roomStateRef.connection = {
      token: 'token',
      livekitUrl: 'url',
      audio: true,
      video: true,
    };
    rerender(target);
    expect(fireBeforeUnload()).toBe(true);

    roomStateRef.connection = undefined;
    roomStateRef.reconnectPrefs = undefined;
    rerender(target);
    expect(fireBeforeUnload()).toBe(false);
  });
});

describe('JamRoom removed-from-jam panel (issue #303 round-13)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    roomStateRef.connection = undefined;
    roomStateRef.reconnectPrefs = undefined;
    roomStateRef.removedFromJam = false;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    roomStateRef.removedFromJam = false;
  });

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const newRoot = createRoot(container);
    root = newRoot;
    act(() => {
      newRoot.render(createElement(JamRoom, { jamPost }));
    });
  };

  it('renders the dedicated "removed from this jam" panel with a view-event link', () => {
    roomStateRef.removedFromJam = true;
    mount();
    // The jam-removed copy (NOT the RSVP `removedMessage`), the jam title,
    // and a link to the post.
    expect(container?.textContent).toContain('Test jam');
    expect(container?.textContent).toContain('You were removed from this jam.');
    const link = container?.querySelector<HTMLAnchorElement>(
      'a[href="/posts/post"]',
    );
    expect(link).not.toBeNull();
    expect(link!.textContent).toBe('View event');
    // Must not reuse the RSVP "organizer removed you from this event" copy.
    expect(container?.textContent).not.toContain(
      'The organizer has removed you from this event.',
    );
  });

  it('does not render the removed panel when not removed', () => {
    roomStateRef.removedFromJam = false;
    mount();
    expect(container?.textContent).not.toContain(
      'You were removed from this jam.',
    );
  });
});
