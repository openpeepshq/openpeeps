/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { RoomEvent, type Room } from 'livekit-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJamSpotlight } from './useJamSpotlight';

type Handler = (...args: unknown[]) => void;
type RoomEventMap = Record<string, Handler[]>;

const createMockRoom = (
  initialMetadata?: string,
  state: string = 'connected',
) => {
  const handlers = {} as RoomEventMap;
  const register = (event: string, handler: Handler) => {
    (handlers[event] ??= []).push(handler);
  };
  const room = {
    state,
    metadata: initialMetadata,
    localParticipant: {
      publishData: vi.fn().mockResolvedValue(undefined),
    },
    on: vi.fn((event: string, handler: Handler) => {
      register(event, handler);
      return room;
    }),
    off: vi.fn((event: string, handler?: Handler) => {
      if (!handler) delete handlers[event];
      else
        handlers[event] = (handlers[event] ?? []).filter((h) => h !== handler);
      return room;
    }),
    once: vi.fn((event: string, handler: Handler) => {
      register(event, handler);
      return room;
    }),
    emit: (event: string, ...args: unknown[]) => {
      for (const handler of handlers[event] ?? []) handler(...args);
    },
  };
  return room as unknown as Room & {
    emit: (e: string, ...a: unknown[]) => void;
  };
};

let setJamSpotlightAction: ReturnType<typeof vi.fn>;

// Mutable view config so tests can flip the viewer between the host
// (moderator) and a plain participant, and pin the jam occurrence for
// recurring-jam cases. Defaults mirror the original host view.
const mockView = vi.hoisted(() => ({
  viewerId: 'host',
  creatorId: 'host',
  moderators: ['host'],
  occurrence: undefined as string | undefined,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      setJamSpotlightAction: () => setJamSpotlightAction,
    },
  }),
}));
vi.mock('../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: mockView.viewerId }),
}));
vi.mock('./JamContext', () => ({
  useJamContext: () => ({
    jamPost: {
      id: 'jam1',
      profile: { id: mockView.creatorId },
      data: { type: 'event' },
    },
    jam: { id: 'jam1', moderators: mockView.moderators },
    occurrence: mockView.occurrence,
  }),
}));

type HookResult = {
  spotlightIdentity: string | null;
  setSpotlight: (identity: string | null) => void;
  canSpotlight: boolean;
};

const renderHook = (
  room: Room,
  participants: { identity: string }[],
): {
  result: { current: HookResult };
  rerender: (participants: { identity: string }[]) => void;
  unmount: () => void;
} => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result: { current: HookResult } = {
    current: undefined as unknown as HookResult,
  };
  const argsRef = { current: { room, participants } };

  const Test = () => {
    result.current = useJamSpotlight(argsRef.current);
    return null;
  };

  const rerender = (nextParticipants: { identity: string }[]) => {
    argsRef.current = { ...argsRef.current, participants: nextParticipants };
    act(() => {
      root.render(createElement(Test));
    });
  };

  act(() => {
    root.render(createElement(Test));
  });

  return {
    result,
    rerender,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const emitSpotlightPacket = (
  room: { emit: (e: string, ...a: unknown[]) => void },
  senderId: string,
  identity: string | null,
) => {
  room.emit(
    RoomEvent.DataReceived,
    new TextEncoder().encode(JSON.stringify({ identity })),
    { identity: senderId },
    undefined,
    'jam-spotlight',
  );
};

describe('useJamSpotlight room metadata', () => {
  let room: ReturnType<typeof createMockRoom>;

  beforeEach(() => {
    setJamSpotlightAction = vi.fn(async () => ({ success: true }));
    room = createMockRoom();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adopts a spotlight from room metadata on mount', () => {
    room = createMockRoom(
      JSON.stringify({
        instanceDomain: 'example.com',
        spotlightIdentity: 'spotlit',
      }),
    );
    const { result, unmount } = renderHook(room, []);
    expect(result.current.spotlightIdentity).toBe('spotlit');
    unmount();
  });

  it('adopts a spotlight from metadata when the room connects after mount', () => {
    // The egress scenario: the observer view mounts before the room
    // connects, so the mount-time `room.state === 'connected'` branch is
    // skipped and adoption must come from the `.once(Connected)` handler,
    // which reads `room.metadata` at connect time (LiveKit updates the
    // metadata before firing Connected).
    room = createMockRoom(
      JSON.stringify({ spotlightIdentity: 'spotlit' }),
      'connecting',
    );
    const { result, unmount } = renderHook(room, []);
    expect(result.current.spotlightIdentity).toBeNull();

    act(() => {
      room.emit(RoomEvent.Connected);
    });

    expect(result.current.spotlightIdentity).toBe('spotlit');
    unmount();
  });

  it('ignores room metadata without a spotlight key', () => {
    room = createMockRoom(JSON.stringify({ instanceDomain: 'example.com' }));
    const { result, unmount } = renderHook(room, []);
    expect(result.current.spotlightIdentity).toBeNull();
    unmount();
  });

  it('follows a roomMetadataChanged update, then a clear', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      room.emit(
        RoomEvent.RoomMetadataChanged,
        JSON.stringify({ spotlightIdentity: 'spotlit' }),
      );
    });
    expect(result.current.spotlightIdentity).toBe('spotlit');

    act(() => {
      room.emit(
        RoomEvent.RoomMetadataChanged,
        JSON.stringify({ spotlightIdentity: null }),
      );
    });
    expect(result.current.spotlightIdentity).toBeNull();
    unmount();
  });

  it('ignores a malformed roomMetadataChanged payload', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      room.emit(RoomEvent.RoomMetadataChanged, 'not-json{');
    });
    expect(result.current.spotlightIdentity).toBeNull();
    unmount();
  });

  it('ignores a roomMetadataChanged event whose spotlightIdentity has the wrong type', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      room.emit(
        RoomEvent.RoomMetadataChanged,
        JSON.stringify({ spotlightIdentity: 42 }),
      );
    });
    expect(result.current.spotlightIdentity).toBeNull();
    unmount();
  });

  it('writes room metadata through the API when the host sets the spotlight', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      result.current.setSpotlight('spotlit');
    });
    expect(setJamSpotlightAction).toHaveBeenCalledWith(
      { identity: 'spotlit' },
      undefined,
      undefined,
    );
    expect(result.current.spotlightIdentity).toBe('spotlit');
    unmount();
  });

  it('clears room metadata when the host clears the spotlight', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      result.current.setSpotlight('spotlit');
    });
    setJamSpotlightAction.mockClear();

    act(() => {
      result.current.setSpotlight(null);
    });
    expect(setJamSpotlightAction).toHaveBeenCalledWith(
      { identity: null },
      undefined,
      undefined,
    );
    unmount();
  });

  it('clears room metadata when the spotlighted participant leaves', () => {
    const { result, rerender, unmount } = renderHook(room, [
      { identity: 'spotlit' },
    ]);
    act(() => {
      result.current.setSpotlight('spotlit');
    });
    setJamSpotlightAction.mockClear();

    rerender([]);

    expect(setJamSpotlightAction).toHaveBeenCalledWith(
      { identity: null },
      undefined,
      undefined,
    );
    unmount();
  });

  it('re-publishes the current spotlight to a late joiner', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      result.current.setSpotlight('spotlit');
    });
    (
      room.localParticipant.publishData as unknown as ReturnType<typeof vi.fn>
    ).mockClear();

    act(() => {
      room.emit(RoomEvent.ParticipantConnected);
    });

    expect(room.localParticipant.publishData).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('ignores spotlight data packets from non-moderators', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      emitSpotlightPacket(room, 'guest', 'guest');
    });
    expect(result.current.spotlightIdentity).toBeNull();
    unmount();
  });

  it('applies spotlight data packets from a moderator', () => {
    const { result, unmount } = renderHook(room, []);
    act(() => {
      emitSpotlightPacket(room, 'host', 'spotlit');
    });
    expect(result.current.spotlightIdentity).toBe('spotlit');
    unmount();
  });

  // --- clear-on-leave persistence: the server metadata write (and its
  // absence) for a non-moderator view.

  it('does not fire the metadata-clear mutation when a non-moderator clears on leave', () => {
    mockView.viewerId = 'guest';
    try {
      const { result, rerender, unmount } = renderHook(room, [
        { identity: 'spotlit' },
      ]);
      // The guest adopts the spotlight from a moderator's data packet.
      act(() => {
        emitSpotlightPacket(room, 'host', 'spotlit');
      });
      expect(result.current.spotlightIdentity).toBe('spotlit');
      setJamSpotlightAction.mockClear();

      rerender([]);

      // Local state still clears, but the guest has no server write.
      expect(result.current.spotlightIdentity).toBeNull();
      expect(setJamSpotlightAction).not.toHaveBeenCalled();
      unmount();
    } finally {
      mockView.viewerId = 'host';
    }
  });

  // --- leave-guard driven by a metadata-adopted spotlight (not locally set).

  it('clears a metadata-adopted spotlight when its participant leaves after mount', () => {
    // Mount adopts 'spotlit' from room metadata; the spotlit participant is
    // present in the roster at first reconciliation.
    room = createMockRoom(JSON.stringify({ spotlightIdentity: 'spotlit' }));
    const { result, rerender, unmount } = renderHook(room, [
      { identity: 'spotlit' },
    ]);
    expect(result.current.spotlightIdentity).toBe('spotlit');
    setJamSpotlightAction.mockClear();

    // The spotlit participant leaves on a later reconciliation.
    rerender([]);

    expect(result.current.spotlightIdentity).toBeNull();
    // The host rewrites the metadata so the egress follows the clear.
    expect(setJamSpotlightAction).toHaveBeenCalledWith(
      { identity: null },
      undefined,
      undefined,
    );
    unmount();
  });

  it('clears a metadata-adopted spotlight locally without a server write for a non-moderator', () => {
    mockView.viewerId = 'guest';
    try {
      room = createMockRoom(JSON.stringify({ spotlightIdentity: 'spotlit' }));
      const { result, rerender, unmount } = renderHook(room, [
        { identity: 'spotlit' },
      ]);
      expect(result.current.spotlightIdentity).toBe('spotlit');
      setJamSpotlightAction.mockClear();

      rerender([]);

      expect(result.current.spotlightIdentity).toBeNull();
      expect(setJamSpotlightAction).not.toHaveBeenCalled();
      unmount();
    } finally {
      mockView.viewerId = 'host';
    }
  });

  // --- server write: occurrence threading and failure containment.

  it('threads the jam occurrence into the metadata write for a recurring jam', () => {
    // `JamContext` supplies the occurrence for the current room; the write
    // must target the same room occurrence (`jamRoomName(jamId, occurrence)`)
    // the room belongs to, not the jam's default occurrence.
    mockView.occurrence = '2026-01-15T12:00:00.000Z';
    try {
      const { result, unmount } = renderHook(room, []);
      act(() => {
        result.current.setSpotlight('spotlit');
      });
      expect(setJamSpotlightAction).toHaveBeenCalledWith(
        { identity: 'spotlit' },
        undefined,
        { occurrence: '2026-01-15T12:00:00.000Z' },
      );
      unmount();
    } finally {
      mockView.occurrence = undefined;
    }
  });

  it('contains a rejected metadata write (no unhandled rejection, state still applies)', async () => {
    const onUnhandledRejection = vi.fn();
    process.on('unhandledRejection', onUnhandledRejection);
    setJamSpotlightAction.mockRejectedValueOnce(new Error('network drop'));
    try {
      const { result, unmount } = renderHook(room, []);
      act(() => {
        result.current.setSpotlight('spotlit');
      });
      // `unhandledRejection` is delivered at task end; give it a turn.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onUnhandledRejection).not.toHaveBeenCalled();
      expect(result.current.spotlightIdentity).toBe('spotlit');
      unmount();
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
