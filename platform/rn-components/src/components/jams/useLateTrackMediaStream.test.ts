/**
 * useLateTrackMediaStream: emits a changing `remountKey` when the track's
 * media stream gains its first video track (and a few times after, as a
 * bounded burst). That is what lets the screen-share VideoTrack remount — and
 * its native view re-run its one-shot `streamURL` attach — once a share that
 * started after we joined delivers its video track, including the first share
 * where `addtrack` fires before the layout is mounted.
 */
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { useLateTrackMediaStream } from './useLateTrackMediaStream';

// Minimal stand-in for the webrtc MediaStream surface the hook touches.
const makeMediaStream = (initialVideoTracks = 0) => {
  const videoTracks: unknown[] = Array.from({ length: initialVideoTracks });
  const listeners: Array<() => void> = [];
  return {
    getVideoTracks: () => videoTracks,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.push(listener),
    removeEventListener: (_type: string, listener: () => void) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    },
    // Test helper, not part of the real MediaStream API.
    addVideoTrack() {
      videoTracks.push({});
      listeners.forEach((listener) => listener());
    },
  };
};

type Stream = ReturnType<typeof makeMediaStream>;

type TrackLike = { mediaStream?: Stream };

const renderHook = (initial: TrackLike | undefined) => {
  let track = initial;
  const captured: Array<
    ReturnType<typeof useLateTrackMediaStream> | undefined
  > = [];
  const Probe = () => {
    captured[0] = useLateTrackMediaStream(
      track as unknown as Parameters<typeof useLateTrackMediaStream>[0]
    );
    return null;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  return {
    get current() {
      return captured[0]!;
    },
    rerender(next: TrackLike | undefined) {
      track = next;
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

describe('useLateTrackMediaStream', () => {
  it('stays at a zero key when there is no track or stream', () => {
    const hook = renderHook(undefined);
    expect(hook.current.remountKey).toBe(0);
    hook.unmount();
  });

  it('does not remount when the stream already has its track at mount', () => {
    const hook = renderHook({ mediaStream: makeMediaStream(1) });
    // The share is already attached: no first-track transition, so the key
    // stays at 0 (no pointless remount of a working view).
    expect(hook.current.remountKey).toBe(0);
    hook.unmount();
  });

  it('bumps the key once when the stream gains its first video track late', () => {
    const stream = makeMediaStream(0);
    const hook = renderHook({ mediaStream: stream });
    expect(hook.current.remountKey).toBe(0);

    act(() => {
      stream.addVideoTrack();
    });
    expect(hook.current.remountKey).toBe(1);
    hook.unmount();
  });

  it('picks up the video track via the poll when no addtrack listener saw it', () => {
    jest.useFakeTimers();
    try {
      const stream = makeMediaStream(0);
      const hook = renderHook({ mediaStream: stream });
      expect(hook.current.remountKey).toBe(0);

      // Simulate the first-share race: the track is added while the layout is
      // not yet mounted, so no `addtrack` listener receives an event.
      stream.getVideoTracks().push({});
      act(() => {
        jest.advanceTimersByTime(150);
      });
      expect(hook.current.remountKey).toBe(1);
      hook.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('emits a bounded burst of remounts after the first track appears', () => {
    jest.useFakeTimers();
    try {
      const stream = makeMediaStream(0);
      const hook = renderHook({ mediaStream: stream });
      expect(hook.current.remountKey).toBe(0);

      // The addtrack callback fires synchronously; wrap in act() so state
      // updates are flushed.
      act(() => {
        stream.addVideoTrack();
      });
      // The first-track transition bumps the key once (key 1).
      expect(hook.current.remountKey).toBe(1);

      // Then a short burst of extra remounts at 300 ms intervals (keys 2..4)
      // while the native stream settles.
      act(() => {
        jest.advanceTimersByTime(300 * 4);
      });
      expect(hook.current.remountKey).toBe(4);

      // The burst is bounded: more time passes without further remounts.
      act(() => {
        jest.advanceTimersByTime(300 * 10);
      });
      expect(hook.current.remountKey).toBe(4);
      hook.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not emit the burst for a stream that already has its track', () => {
    jest.useFakeTimers();
    try {
      const hook = renderHook({ mediaStream: makeMediaStream(1) });
      expect(hook.current.remountKey).toBe(0);

      // No 0 → 1 transition ever happens, so no remount burst should fire.
      act(() => {
        jest.advanceTimersByTime(300 * 20);
      });
      expect(hook.current.remountKey).toBe(0);
      hook.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('follows the current stream when the track changes', () => {
    jest.useFakeTimers();
    try {
      const first = makeMediaStream(0);
      const second = makeMediaStream(1);
      const hook = renderHook({ mediaStream: first });
      expect(hook.current.remountKey).toBe(0);

      act(() => {
        first.addVideoTrack();
      });
      expect(hook.current.remountKey).toBe(1);

      hook.rerender({ mediaStream: second });
      // Switching to a stream that already has its track resets the epoch: no
      // spurious remount burst for the already-attached second share.
      expect(hook.current.remountKey).toBe(0);

      // The old stream no longer drives the key.
      act(() => {
        first.addVideoTrack();
      });
      // Still no remount: the swap cleared the listener and the burst, so the
      // stale stream's late track cannot bump the key.
      expect(hook.current.remountKey).toBe(0);

      act(() => {
        second.addVideoTrack();
      });
      // A stream that already has a track gaining another is not a
      // first-track transition: no spurious remount (pins justGotFirst to the
      // 0 → 1 edge, not a plain count > prev).
      expect(hook.current.remountKey).toBe(0);
      hook.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('resets the key when swapping to a stream whose track has not arrived yet', () => {
    jest.useFakeTimers();
    try {
      const first = makeMediaStream(0);
      const hook = renderHook({ mediaStream: first });

      act(() => {
        first.addVideoTrack();
      });
      expect(hook.current.remountKey).toBe(1);

      // Swap to a stream whose track has not arrived yet: the epoch must
      // reset so the new share's burst starts from 1 instead of carrying the
      // first stream's key forward (reset-before-refresh ordering).
      const second = makeMediaStream(0);
      hook.rerender({ mediaStream: second });
      expect(hook.current.remountKey).toBe(0);

      // The new stream gains its track: the burst starts at key 1.
      act(() => {
        second.addVideoTrack();
      });
      expect(hook.current.remountKey).toBe(1);
      hook.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});
