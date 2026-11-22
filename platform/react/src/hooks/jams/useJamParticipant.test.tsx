/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JamJoinParams } from './useJamRoom';
import { useJoinWaitingRoomToken } from './useJamParticipant';

// The join-waiting-room stream is the only thing that leaves the hook, so it
// is stubbed to a controllable value; `onJoin`/`onDenied` are caller-supplied
// spies and the jam context is a fixed minimal jam. The test drives the
// stream from "no decision yet" to a denial or a token and checks which
// callback fires — the `'denied' in tokenResponse` narrowing that
// JamRequestJoin.test.tsx exercises only transitively (it mocks this hook).
type StreamResponse =
  | { denied: true }
  | { token: string; livekitUrl: string }
  | undefined;

let mockStreamResponse: StreamResponse;

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useJoinWaitingRoomStream: () => mockStreamResponse,
    },
  }),
}));

vi.mock('../../components/jams/JamContext', () => ({
  useJamContext: () => ({
    jamPost: { id: 'post1' },
    jam: { moderators: ['mod-1'], waitingRoom: true },
    occurrence: undefined,
  }),
}));

vi.mock('../../i18n', () => ({
  useT: () => (_key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}));

describe('useJoinWaitingRoomToken denied branch', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let onJoin: (params: JamJoinParams) => void;
  let onDenied: () => void;

  const Host = () => {
    useJoinWaitingRoomToken(onJoin, undefined, onDenied);
    return null;
  };

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(Host));
    });
  };

  const rerender = (response: StreamResponse) => {
    mockStreamResponse = response;
    act(() => {
      root?.render(createElement(Host));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockStreamResponse = undefined;
    onJoin = vi.fn();
    onDenied = vi.fn();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('does nothing before the stream yields a decision', () => {
    mount();
    expect(onJoin).not.toHaveBeenCalled();
    expect(onDenied).not.toHaveBeenCalled();
  });

  it('fires onDenied and skips onJoin for a denial', () => {
    mount();
    rerender({ denied: true });
    expect(onDenied).toHaveBeenCalledTimes(1);
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('fires onJoin (not onDenied) for a token response', () => {
    mount();
    rerender({ token: 'tok1', livekitUrl: 'https://livekit.example' });
    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(onJoin).toHaveBeenCalledWith({
      token: 'tok1',
      livekitUrl: 'https://livekit.example',
      choices: { audioEnabled: true, videoEnabled: true },
    });
    expect(onDenied).not.toHaveBeenCalled();
  });
});
