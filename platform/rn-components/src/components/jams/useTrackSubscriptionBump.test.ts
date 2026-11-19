/**
 * useTrackSubscriptionBump: re-renders the caller when a remote video track
 * is (un)subscribed, which lets a mid-Jam camera re-read `publication.track`
 * instead of staying on the avatar/blank fallback until rejoin (#1808).
 *
 * Only the room surface is stubbed: a fake Room captures the listeners
 * registered via `on` and removes them on `off`, the same way the real
 * room's event emitter would. The hook runs as real code against the real
 * `livekit-client` constants.
 *
 * The second describe block mounts the real `JamConference` (with the
 * sibling components and the livekit/react-native surface stubbed) to pin
 * the wiring: the bump is applied once in the shared parent, so both the
 * participant and the observer `useTracks` consumers are covered.
 */
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { RoomEvent, Track } from 'livekit-client';
import { useTrackSubscriptionBump } from './useTrackSubscriptionBump';

const makeRoom = () => {
  const listeners = new Map<string, Array<(track: Track) => void>>();
  return {
    on(event: string, cb: (track: Track) => void) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
      return this;
    },
    off(event: string, cb: (track: Track) => void) {
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((l) => l !== cb)
      );
      return this;
    },
    fire(event: string, track: Track) {
      listeners.get(event)?.forEach((cb) => cb(track));
    },
    listenerCount(event: string) {
      return listeners.get(event)?.length ?? 0;
    },
  };
};

type Room = ReturnType<typeof makeRoom>;

const videoTrack = { kind: Track.Kind.Video } as unknown as Track;
const audioTrack = { kind: Track.Kind.Audio } as unknown as Track;

const renderProbe = (initialRoom: Room) => {
  let room = initialRoom;
  let renders = 0;
  const Probe = () => {
    useTrackSubscriptionBump(
      room as unknown as Parameters<typeof useTrackSubscriptionBump>[0]
    );
    renders += 1;
    return null;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  return {
    get renders() {
      return renders;
    },
    rerender(nextRoom: Room) {
      room = nextRoom;
      act(() => {
        renderer.update(React.createElement(Probe));
      });
    },
    unmount() {
      act(() => {
        renderer.unmount();
      });
    },
  };
};

describe('useTrackSubscriptionBump', () => {
  it('re-renders on a remote video TrackSubscribed', () => {
    const room = makeRoom();
    const probe = renderProbe(room);
    const initial = probe.renders;

    act(() => {
      room.fire(RoomEvent.TrackSubscribed, videoTrack);
    });
    expect(probe.renders).toBe(initial + 1);
    probe.unmount();
  });

  it('re-renders on a remote video TrackUnsubscribed', () => {
    const room = makeRoom();
    const probe = renderProbe(room);
    const initial = probe.renders;

    act(() => {
      room.fire(RoomEvent.TrackUnsubscribed, videoTrack);
    });
    expect(probe.renders).toBe(initial + 1);
    probe.unmount();
  });

  it('coalesces a same-sid track swap (TrackUnsubscribed followed by TrackSubscribed) into exactly one re-render', () => {
    const room = makeRoom();
    const probe = renderProbe(room);
    const initial = probe.renders;

    // The order RemoteTrackPublication.setTrack emits on a same-sid swap:
    // the old track unsubscribes, the new track subscribes, no status event.
    act(() => {
      room.fire(RoomEvent.TrackUnsubscribed, videoTrack);
      room.fire(RoomEvent.TrackSubscribed, videoTrack);
    });
    // The coalesced pair must not double-bump per swap: exactly one
    // re-render, so the tile neither double-remounts nor misses the swap.
    expect(probe.renders).toBe(initial + 1);

    // A second swap bumps again — the tile never sticks on the fallback.
    act(() => {
      room.fire(RoomEvent.TrackUnsubscribed, videoTrack);
      room.fire(RoomEvent.TrackSubscribed, videoTrack);
    });
    expect(probe.renders).toBe(initial + 2);
    probe.unmount();
  });

  it('ignores audio tracks, so joins do not re-render the conference', () => {
    const room = makeRoom();
    const probe = renderProbe(room);
    const initial = probe.renders;

    act(() => {
      room.fire(RoomEvent.TrackSubscribed, audioTrack);
      room.fire(RoomEvent.TrackUnsubscribed, audioTrack);
    });
    expect(probe.renders).toBe(initial);
    probe.unmount();
  });

  it('removes both listeners on unmount', () => {
    const room = makeRoom();
    const probe = renderProbe(room);
    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(1);
    expect(room.listenerCount(RoomEvent.TrackUnsubscribed)).toBe(1);

    probe.unmount();
    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(0);
    expect(room.listenerCount(RoomEvent.TrackUnsubscribed)).toBe(0);
  });

  it('re-registers on the new room when the room instance changes', () => {
    const first = makeRoom();
    const second = makeRoom();
    const probe = renderProbe(first);

    probe.rerender(second);
    expect(first.listenerCount(RoomEvent.TrackSubscribed)).toBe(0);
    expect(first.listenerCount(RoomEvent.TrackUnsubscribed)).toBe(0);
    expect(second.listenerCount(RoomEvent.TrackSubscribed)).toBe(1);
    expect(second.listenerCount(RoomEvent.TrackUnsubscribed)).toBe(1);

    // Only the current room drives re-renders.
    const initial = probe.renders;
    act(() => {
      first.fire(RoomEvent.TrackSubscribed, videoTrack);
    });
    expect(probe.renders).toBe(initial);

    act(() => {
      second.fire(RoomEvent.TrackSubscribed, videoTrack);
    });
    expect(probe.renders).toBe(initial + 1);
    probe.unmount();
  });
});

// ---------------------------------------------------------------------------
// JamConference wiring: the bump is applied once in the shared parent, so
// both the participant and the observer useTracks consumers are covered
// (#1808). Sibling components and the livekit/react-native surface are
// stubbed; the real JamConference + useTrackSubscriptionBump run against the
// real livekit-client constants.
// ---------------------------------------------------------------------------

let mockIsObserver = false;
let mockConferenceRoom!: ReturnType<typeof makeRoom>;
let mockParticipantRenders = 0;
let mockVideoLayoutRenders = 0;

jest.mock('react-native', () => {
  const passthrough = (name: string) => (props: { children?: unknown }) =>
    require('react').createElement(name, null, props.children);
  return {
    View: passthrough('View'),
    Pressable: passthrough('Pressable'),
    ScrollView: passthrough('ScrollView'),
    StyleSheet: { absoluteFill: {} },
  };
});

jest.mock('@livekit/react-native', () => ({
  isTrackReference: (track: unknown) =>
    !!track && (track as { publication?: unknown }).publication !== undefined,
  useRoomContext: () => mockConferenceRoom,
  useTracks: () => [],
}));

jest.mock('@openpeepshq/react', () => ({
  JamEventsProvider: ({ children }: { children: unknown }) =>
    require('react').createElement('JamEventsProvider', null, children),
  useDropLateAudio: () => undefined,
  useJamObserver: () => mockIsObserver,
}));

jest.mock('./JamParticipantConference', () => ({
  JamParticipantConference: () => {
    mockParticipantRenders += 1;
    return null;
  },
}));

jest.mock('./JamObserverShell', () => ({
  JamObserverShell: ({ children }: { children: unknown }) =>
    require('react').createElement('JamObserverShell', null, children),
}));

jest.mock('./JamVideoLayout', () => ({
  JamVideoLayout: () => {
    mockVideoLayoutRenders += 1;
    return null;
  },
}));

const { JamConference } = require('./JamConference');

const renderConference = (
  isObserver: boolean,
  room: ReturnType<typeof makeRoom>
) => {
  mockIsObserver = isObserver;
  mockConferenceRoom = room;
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(JamConference));
  });
  return {
    unmount() {
      act(() => {
        renderer.unmount();
      });
    },
  };
};

describe('JamConference wiring', () => {
  it('registers the track-swap bump once for an observer (observer path)', () => {
    const room = makeRoom();
    const conference = renderConference(true, room);
    // One listener pair, from the shared JamConference parent — the observer
    // useTracks consumer is covered without a second registration.
    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(1);
    expect(room.listenerCount(RoomEvent.TrackUnsubscribed)).toBe(1);

    const before = mockVideoLayoutRenders;
    act(() => {
      room.fire(RoomEvent.TrackSubscribed, videoTrack);
    });
    expect(mockVideoLayoutRenders).toBe(before + 1);

    conference.unmount();
    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(0);
    expect(room.listenerCount(RoomEvent.TrackUnsubscribed)).toBe(0);
  });

  it('registers the track-swap bump once for a participant (participant path)', () => {
    const room = makeRoom();
    const conference = renderConference(false, room);
    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(1);
    expect(room.listenerCount(RoomEvent.TrackUnsubscribed)).toBe(1);

    const before = mockParticipantRenders;
    act(() => {
      room.fire(RoomEvent.TrackSubscribed, videoTrack);
    });
    expect(mockParticipantRenders).toBe(before + 1);

    conference.unmount();
    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(0);
  });
});
