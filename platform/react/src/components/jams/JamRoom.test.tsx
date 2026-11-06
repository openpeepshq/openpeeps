/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PublicPost } from '@openpeepshq/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamRoom } from './JamRoom';

const roomStateRef = vi.hoisted(() => ({
  connection: undefined as
    | { token: string; livekitUrl: string; audio: boolean; video: boolean }
    | undefined,
  reconnectPrefs: undefined as { audio: boolean; video: boolean } | undefined,
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

vi.mock('../../i18n', () => ({
  useT: () => (_key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
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
