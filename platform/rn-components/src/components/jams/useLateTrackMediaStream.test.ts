/**
 * useLateTrackMediaStream: reports how many video tracks the track's media
 * stream currently has, and re-reports each time the stream gains a track.
 * That is what lets the screen-share VideoTrack remount — and its native view
 * re-resolve — once a share that started after we joined delivers its video
 * track.
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
  const captured: number[] = [];
  const Probe = () => {
    captured[0] = useLateTrackMediaStream(track);
    return null;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  return {
    get current() {
      return captured[0];
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
  it('reports zero when there is no track or stream', () => {
    const hook = renderHook(undefined);
    expect(hook.current).toBe(0);
    hook.unmount();
  });

  it('reports the existing video track count on first render', () => {
    const hook = renderHook({ mediaStream: makeMediaStream(1) });
    expect(hook.current).toBe(1);
    hook.unmount();
  });

  it('increments when the stream gains a video track late', () => {
    const stream = makeMediaStream(0);
    const hook = renderHook({ mediaStream: stream });
    expect(hook.current).toBe(0);

    act(() => {
      stream.addVideoTrack();
    });
    expect(hook.current).toBe(1);
    hook.unmount();
  });

  it('follows the current stream when the track changes', () => {
    const first = makeMediaStream(0);
    const second = makeMediaStream(1);
    const hook = renderHook({ mediaStream: first });
    expect(hook.current).toBe(0);

    act(() => {
      first.addVideoTrack();
    });
    expect(hook.current).toBe(1);

    hook.rerender({ mediaStream: second });
    expect(hook.current).toBe(1);

    // The old stream no longer drives the value.
    act(() => {
      first.addVideoTrack();
    });
    expect(hook.current).toBe(1);

    act(() => {
      second.addVideoTrack();
    });
    expect(hook.current).toBe(2);
    hook.unmount();
  });
});
