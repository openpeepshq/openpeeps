/** @vitest-environment jsdom */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamRequestJoin } from './JamRequestJoin';

// The hook is the only thing that talks to the join stream; capturing its
// `onDenied` callback lets the test drive the denied transition directly
// (a real stream would emit `{ denied: true }`).
const { onDeniedRef } = vi.hoisted(() => ({
  onDeniedRef: { current: undefined as (() => void) | undefined },
}));

vi.mock('../../hooks/jams/useJamParticipant', () => ({
  useJoinWaitingRoomToken: (
    _onJoin: unknown,
    _onError: unknown,
    onDenied?: () => void,
  ) => {
    onDeniedRef.current = onDenied;
  },
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
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
});
