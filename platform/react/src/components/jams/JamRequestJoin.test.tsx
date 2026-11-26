/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitingRoomTMock } from '../../test/support/waitingRoomTMock';
import { JamRequestJoin } from './JamRequestJoin';

// The hook is the only thing that talks to the join stream; capturing its
// `onDenied` and `onError` callbacks lets the test drive the denied
// transition and the non-2xx surface directly (a real stream would emit
// `{ denied: true }` / an SseError).
const { onDeniedRef, onErrorRef } = vi.hoisted(() => ({
  onDeniedRef: { current: undefined as (() => void) | undefined },
  onErrorRef: { current: undefined as ((e: unknown) => void) | undefined },
}));

vi.mock('../../hooks/jams/useJamParticipant', () => ({
  useJoinWaitingRoomToken: (
    _onJoin: unknown,
    onError: (e: unknown) => void,
    onDenied?: () => void,
  ) => {
    onErrorRef.current = onError;
    onDeniedRef.current = onDenied;
  },
}));

// The component maps the SseError through the real shared `apiErrorMessage`
// helper (empty fallback so a keyless error renders nothing) — only the
// translation is mocked, via the shared waiting-room t-mock, so a regression
// in the helper's key extraction would fail the rendered-copy assertion below.
vi.mock('../../i18n', () => ({
  useT: () => waitingRoomTMock,
}));

vi.mock('./JamContext', () => ({
  JamProvider: ({ children }: { children?: ReactNode }) =>
    createElement('div', null, children),
}));

describe('JamRequestJoin denied phase', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    onDeniedRef.current = undefined;
    onErrorRef.current = undefined;
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
      newRoot.render(
        createElement(JamRequestJoin, {
          onJoin: vi.fn(),
        }),
      );
    });
  };

  const requestButton = () =>
    container?.querySelector('button') as HTMLButtonElement | null;

  it('shows the rejection message and offers the request again after a denial', () => {
    mount();

    // Idle: only the request button, no rejection copy.
    expect(requestButton()?.textContent).toBe('Request to join');
    expect(container?.textContent).not.toContain('declined your request');

    // Requesting starts the waiting phase (the join stream is opened).
    act(() => {
      requestButton()?.click();
    });
    expect(onDeniedRef.current).toBeDefined();
    expect(container?.textContent).toContain(
      'Waiting for a moderator to let you in',
    );

    // The stream reports a denial: the phase switches to denied.
    act(() => {
      onDeniedRef.current?.();
    });

    // The rejection copy is shown and the request is offered again.
    expect(container?.textContent).toContain(
      'The moderator declined your request to join',
    );
    expect(container?.textContent).not.toContain(
      'Waiting for a moderator to let you in',
    );
    expect(requestButton()?.textContent).toBe('Request to join');

    // Requesting again goes back to the waiting phase.
    act(() => {
      requestButton()?.click();
    });
    expect(container?.textContent).toContain(
      'Waiting for a moderator to let you in',
    );
  });

  it('renders the mapped guest-pass copy for a 401 on the join stream', () => {
    // The plan's step-5 ask: a non-2xx join stream surfaces the mapped
    // `error.jamGuestPassRequired` copy end to end (SseError →
    // `apiErrorMessage` → the rendered alert), not a parse error and not a
    // raw key.
    mount();
    act(() => {
      requestButton()?.click();
    });
    expect(onErrorRef.current).toBeTypeOf('function');

    act(() => {
      onErrorRef.current?.({
        status: 401,
        key: 'error.jamGuestPassRequired',
      });
    });

    const alert = container?.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe(
      'Sign in, or create a guest pass, to join this jam.',
    );
    // The key itself is never rendered raw.
    expect(container?.textContent).not.toContain('error.jamGuestPassRequired');
    // The error is non-terminal: the waiting copy stays underneath.
    expect(container?.textContent).toContain(
      'Waiting for a moderator to let you in',
    );
  });

  it('renders nothing for a keyless, messageless join-stream failure', () => {
    // The component passes `''` as the fallback of `apiErrorMessage`, so a
    // failure with no body to parse renders no alert (and no raw key)
    // instead of a generic "Error".
    mount();
    act(() => {
      requestButton()?.click();
    });
    act(() => {
      onErrorRef.current?.({ status: 503 });
    });
    expect(container?.querySelector('[role="alert"]')).toBeNull();
    expect(container?.textContent).not.toContain('Error');
    expect(container?.textContent).toContain(
      'Waiting for a moderator to let you in',
    );
  });
});
