/**
 * Regression tests for #2088 (rejoining a Jam shows only the current user).
 *
 * Root cause: on rejoin the native path re-`connect()`ed the *same* Room the
 * previous join used. LiveKit rebuilds `remoteParticipants` on a reconnection
 * but does not re-emit `ParticipantConnected`, so the conference subtree never
 * re-renders with the other participants. Web avoids this because it creates a
 * fresh `Room` per join.
 *
 * The fix (approved plan, Option A): each join owns a fresh `Room`, provided to
 * the conference subtree via a local `RoomContext.Provider`. These tests pin the
 * wiring that makes a rejoin see the normal initial-join event flow:
 *   - the room the conference subscribes to is a fresh `Room`, not the host's
 *   - each (re)mount — i.e. each join — creates its own `Room`
 *   - the host's pre-warmed room is never disconnected (the RN host keeps it
 *     alive across in-call navigation, per the maintainers' stable-room intent)
 *
 * `livekit-client`'s `Room` is stubbed to capture constructed instances and
 * `connect`/`disconnect` calls (no network); the real `RoomEvent` and
 * `MediaDeviceFailure` are kept so the real `useStableLiveKitRoom` wiring runs.
 */
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn().mockResolvedValue(undefined) },
  Platform: { OS: 'android' },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Context-driven room surface: `useRoomContext` reads `RoomContext` so the
// provider that `JamVideoCall` renders around the conference is observable, and
// `AudioSession` is a no-op stub (the Android path skips it anyway).
const RoomContext = React.createContext<unknown>(undefined);
jest.mock('@livekit/react-native', () => ({
  RoomContext,
  useRoomContext: () => React.useContext(RoomContext),
  AudioSession: {
    setAppleAudioConfiguration: jest.fn().mockResolvedValue(undefined),
    startAudioSession: jest.fn().mockResolvedValue(undefined),
    stopAudioSession: jest.fn().mockResolvedValue(undefined),
  },
}));

// Capture every Room the component constructs. Real event constants, fake class.
jest.mock('livekit-client', () => {
  const actual = jest.requireActual('livekit-client');
  const store: { instances: Array<Record<string, unknown>> } = {
    instances: [],
  };
  class Room {
    options: Record<string, unknown>;
    connect: jest.Mock;
    disconnect: jest.Mock;
    localParticipant: Record<string, jest.Mock>;
    constructor(options?: Record<string, unknown>) {
      this.options = options ?? {};
      this.connect = jest.fn().mockResolvedValue(undefined);
      this.disconnect = jest.fn();
      this.localParticipant = {
        setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
        setCameraEnabled: jest.fn().mockResolvedValue(undefined),
        setScreenShareEnabled: jest.fn().mockResolvedValue(undefined),
      };
      store.instances.push(this);
    }
    on() {
      return this;
    }
    off() {
      return this;
    }
    simulateParticipants() {}
  }
  return { ...actual, Room, __roomStore: store };
});

// Capture the room the conference subtree actually receives.
const CAPTURED = '__capturedRooms';
jest.mock('./JamConference', () => {
  return {
    JamConference: () => {
      const { useRoomContext } = require('@livekit/react-native');
      const room = useRoomContext();
      ((globalThis as Record<string, unknown>)[CAPTURED] as unknown[]).push(
        room
      );
      return null;
    },
  };
});

const { JamVideoCall } = require('./JamVideoCall');

const roomStore = () =>
  require('livekit-client').__roomStore as { instances: unknown[] };
const capturedRooms = () =>
  (globalThis as Record<string, unknown>)[CAPTURED] as unknown[];

// Initialise the capture array before any mount pushes into it.
if (!(globalThis as Record<string, unknown>)[CAPTURED]) {
  (globalThis as Record<string, unknown>)[CAPTURED] = [];
}

const SERVER = 'wss://livekit.example';
// The host's pre-warmed, app-wide room: kept connected across navigation.
// A full room stand-in (on/off, like the pre-fix code wired into the hook),
// so a regression fails on the assertions, not on mock gaps.
const makeHostRoom = () => {
  const host: Record<string, unknown> = {
    options: { dynacast: true, adaptiveStream: true, webAudioMix: true },
    disconnect: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    localParticipant: {
      setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
      setCameraEnabled: jest.fn().mockResolvedValue(undefined),
    },
  };
  host.on = jest.fn().mockReturnValue(host);
  host.off = jest.fn().mockReturnValue(host);
  host.simulateParticipants = jest.fn();
  return host;
};

const renderCall = (hostRoom: unknown, token: string) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(
        RoomContext.Provider,
        { value: hostRoom },
        React.createElement(JamVideoCall, {
          token,
          serverUrl: SERVER,
          audio: true,
          video: true,
        })
      )
    );
  });
  return {
    unmount() {
      // The join room's disconnect-on-unmount effect fires an expected
      // "act() not balanced" dev warning through the mocked room; suppress it.
      const warn = console.error;
      console.error = (...args: unknown[]) => {
        if (
          typeof args[0] === 'string' &&
          args[0].includes('not wrapped in act')
        ) {
          return;
        }
        warn(...args);
      };
      try {
        act(() => {
          renderer.unmount();
        });
      } finally {
        console.error = warn;
      }
    },
  };
};

describe('JamVideoCall room lifecycle (#2088)', () => {
  let hostRoom: ReturnType<typeof makeHostRoom>;

  beforeEach(() => {
    roomStore().instances.length = 0;
    ((globalThis as Record<string, unknown>)[CAPTURED] as unknown[]).length = 0;
    hostRoom = makeHostRoom();
  });

  it('subscribes the conference to a fresh Room, not the host room', () => {
    const call = renderCall(hostRoom, 'tok-1');
    try {
      const provided = capturedRooms()[capturedRooms().length - 1];
      const fresh = roomStore().instances[0];

      // The room the conference reads is a freshly constructed one…
      expect(provided).toBe(fresh);
      // …and it is not the host's pre-warmed room.
      expect(provided).not.toBe(hostRoom);
      // The fresh room is seeded from the host's options (media parity).
      expect(provided).toHaveProperty('options', hostRoom.options);
      // The fresh room is the one that connects, with the join token.
      expect(fresh.connect).toHaveBeenCalledWith(SERVER, 'tok-1', undefined);
    } finally {
      call.unmount();
    }
  });

  it('creates a brand-new Room for each join, so a rejoin gets a clean join', () => {
    const first = renderCall(hostRoom, 'tok-1');
    const firstRoom = roomStore().instances[0];
    first.unmount();

    // Rejoin: a new mount (re-token) must not reuse the previous Room.
    const second = renderCall(hostRoom, 'tok-2');
    try {
      expect(roomStore().instances).toHaveLength(2);
      const rejoinRoom = roomStore().instances[1];
      expect(rejoinRoom).not.toBe(firstRoom);
      expect(rejoinRoom).not.toBe(hostRoom);
      const provided = capturedRooms()[capturedRooms().length - 1];
      expect(provided).toBe(rejoinRoom);
      expect(rejoinRoom.connect).toHaveBeenCalledWith(
        SERVER,
        'tok-2',
        undefined
      );
    } finally {
      second.unmount();
    }
  });

  it('never disconnects the host room (stable room across navigation)', () => {
    const call = renderCall(hostRoom, 'tok-1');
    call.unmount(); // leaving the join tears down the join's own room…
    expect(hostRoom.disconnect).not.toHaveBeenCalled();
  });
});
