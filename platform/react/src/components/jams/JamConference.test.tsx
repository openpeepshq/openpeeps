/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JamConference } from './JamConference';

const connectionStateRef = vi.hoisted(() => ({
  value: 'disconnected' as 'disconnected' | 'connected',
}));

vi.mock('@livekit/components-react', () => ({
  RoomAudioRenderer: () => null,
  isTrackReference: () => false,
  useConnectionState: () => connectionStateRef.value,
  useRoomContext: () => ({}),
  useTracks: () => [],
}));

vi.mock('livekit-client', () => ({
  ConnectionState: {
    Disconnected: 'disconnected',
    Connected: 'connected',
    Reconnecting: 'reconnecting',
  },
  Track: { Source: { Camera: 'camera', ScreenShare: 'screen_share' } },
}));

vi.mock('./JamContext', () => ({
  useJamObserver: () => false,
}));

vi.mock('./dropLateAudio', () => ({
  useDropLateAudio: () => {},
}));

vi.mock('./JamEventsContext', () => ({
  JamEventsProvider: ({ children }: { children?: unknown }) =>
    createElement('div', null, children as never),
}));

vi.mock('./JamObserverShell', () => ({
  JamObserverShell: ({ children }: { children?: unknown }) =>
    createElement('div', null, children as never),
}));

vi.mock('./JamParticipantConference', () => ({
  JamParticipantConference: () => null,
}));

vi.mock('./JamVideoLayout', () => ({
  JamVideoLayout: () => null,
}));

const fireBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('JamConference tab-close warning', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    connectionStateRef.value = 'disconnected';
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
      newRoot.render(createElement(JamConference));
    });
    return { container, root: newRoot };
  };

  it('does not warn while the call is not connected', () => {
    mount();
    expect(fireBeforeUnload()).toBe(false);
  });

  it('warns while connected and stops after unmount', () => {
    const { root } = mount();

    connectionStateRef.value = 'connected';
    act(() => {
      root.render(createElement(JamConference));
    });
    expect(fireBeforeUnload()).toBe(true);

    act(() => {
      root.unmount();
    });
    expect(fireBeforeUnload()).toBe(false);
  });
});
