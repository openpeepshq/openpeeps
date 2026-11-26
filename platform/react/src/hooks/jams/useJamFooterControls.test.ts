/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type JamWaitingRoomEntry } from '@openpeepshq/common/types';
import { waitingRoomTMock } from '../../test/support/waitingRoomTMock';
import {
  diffWaitingRoomAdditions,
  useJamFooterControls,
} from './useJamFooterControls';

vi.mock('../../i18n/context', () => ({
  useT: () => tMock,
}));
vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'moderator' }),
}));
vi.mock('../../components/server-data/context', () => ({
  useServerInfo: () => ({
    jams: { livekit: { recordingEnabled: false } },
  }),
}));
vi.mock('../../components/jams/JamContext', () => ({
  useJamContext: () => ({
    jam,
    jamPost: { id: mockJamPostId },
    occurrence: undefined,
  }),
}));
vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      startRecordingAction: () => () => Promise.resolve({ id: 'rec' }),
      stopRecordingAction: () => () => Promise.resolve({ id: 'rec' }),
      useWaitingRoomStream: (
        _id: unknown,
        _occ: unknown,
        onError?: (e: unknown) => void,
      ) => {
        mockWaitingRoomOnError = onError;
        return mockWaitingRoom;
      },
    },
  }),
}));
vi.mock('../../components/jams/JamEventsContext', () => ({
  useJamEventsContext: () => ({ sendReactionEmoji: () => {} }),
}));
vi.mock('../../components/jams/jamRecordingState', () => ({
  useJamRecordingState: () => ({ isRecording: false }),
}));
vi.mock('../../components/jams/useJamHands', () => ({
  useRaisedHands: () => new Set<string>(),
}));
vi.mock('../../components/jams/jamEventActions', () => ({
  toggleHand: async () => {},
}));

// The shared waiting-room t-mock mirrors how the source calls `t`: the
// `jams.waitingRoom.*` fallback resolves to its en.json value, and bare
// `error.*` keys pass through raw (the source hands them to the resolver
// with no defaultValue, so a bare `t(key)` regression would be caught).
// `apiErrorMessage` is the real implementation — the mock t feeds it the
// same key→copy semantics real i18n would (review suggestion 1).
const tMock = waitingRoomTMock;

// Module scope so the vi.mock factories above can read the current values.
let mockJamPostId: string;
let jam: { moderators: string[]; waitingRoom: boolean };
let mockWaitingRoom: Record<string, JamWaitingRoomEntry> | undefined;
// Captures the `onError` the hook hands the waiting-room stream, so a test
// can drive a non-2xx failure and assert the toast routing.
let mockWaitingRoomOnError: ((e: unknown) => void) | undefined;

// The waiting-room stream sends display-only entries keyed by profile id
// (`jamWaitingRoomEntrySchema`), so the fixtures use that shape, not full
// profiles. The record key stands in for the profile id.
const entry = (displayName?: string): JamWaitingRoomEntry =>
  displayName ? { displayName } : {};

describe('diffWaitingRoomAdditions', () => {
  it('returns empty when prev is null', () => {
    expect(diffWaitingRoomAdditions(null, { a: entry('alice') })).toEqual([]);
  });

  it('returns empty when next is undefined', () => {
    expect(diffWaitingRoomAdditions({ a: entry('alice') }, undefined)).toEqual(
      [],
    );
  });

  it('returns empty when no additions', () => {
    const prev = { a: entry('alice') };
    const next = { a: entry('alice') };
    expect(diffWaitingRoomAdditions(prev, next)).toEqual([]);
  });

  it('returns a single addition', () => {
    const prev = { a: entry('alice') };
    const next = { a: entry('alice'), b: entry('bob') };
    const result = diffWaitingRoomAdditions(prev, next);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ displayName: 'bob' });
  });

  it('returns multiple additions batched', () => {
    const prev = { a: entry('alice') };
    const next = {
      a: entry('alice'),
      b: entry('bob'),
      c: entry('carol'),
    };
    const result = diffWaitingRoomAdditions(prev, next);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.displayName)).toEqual(['bob', 'carol']);
  });

  it('excludes removals (admit/deny)', () => {
    const prev = { a: entry('alice'), b: entry('bob') };
    const next = { a: entry('alice') };
    expect(diffWaitingRoomAdditions(prev, next)).toEqual([]);
  });

  it('does not treat an unchanged entry as a re-join (same id, new object)', () => {
    const prev = { a: entry('alice') };
    const next: Record<string, JamWaitingRoomEntry> = {
      a: { ...entry('alice') },
    };
    // The diff keys by profile id: an entry that is still present is not an
    // addition, even when its object identity differs between snapshots.
    expect(diffWaitingRoomAdditions(prev, next)).toEqual([]);
  });

  it('counts a leave-then-rejoin as an addition again', () => {
    // Snapshot 1: Bob is waiting; snapshot 2: Bob was admitted (removed);
    // snapshot 3: Bob rejoined — he must count as a new addition.
    const waiting = { a: entry('alice'), b: entry('bob') };
    const afterAdmit = { a: entry('alice') };
    expect(diffWaitingRoomAdditions(waiting, afterAdmit)).toEqual([]);
    const afterRejoin = { a: entry('alice'), b: entry('bob') };
    const result = diffWaitingRoomAdditions(afterAdmit, afterRejoin);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ displayName: 'bob' });
  });

  it('keeps insertion order of the next snapshot', () => {
    // Toast copy is derived from the returned array; order must follow the
    // server snapshot, not the previous map's key order.
    const prev = { c: entry('carol') };
    const next = {
      a: entry('alice'),
      b: entry('bob'),
      c: entry('carol'),
    };
    const result = diffWaitingRoomAdditions(prev, next);
    expect(result.map((e) => e.displayName)).toEqual(['alice', 'bob']);
  });
});

// Hook-level regression tests for the baseline reset: the first snapshot of a
// *new* room (occurrence switch, or the moderator gate toggling back on) must
// re-baseline silently instead of diffing against the previous room's last
// snapshot and announcing everyone already waiting there in one burst toast.
describe('useJamFooterControls waiting-room baseline reset', () => {
  let showToast: (message: string) => void;
  let captured: ReturnType<typeof useJamFooterControls> | undefined;

  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  // A single stable component type, so repeated `rerender()` calls update the
  // existing fiber (re-render) instead of swapping the type and remounting —
  // a remount would reset the baseline ref and defeat the whole test.
  const Host = () => {
    captured = useJamFooterControls({
      room: { localParticipant: { identity: 'moderator' } } as never,
      participantCount: 1,
      confirmStopRecording: () => true,
      onSuccess: () => {},
      onError: () => {},
      showToast,
    });
    return null;
  };

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(createElement(Host));
    });
  };

  const rerender = () => {
    act(() => {
      root?.render(createElement(Host));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockJamPostId = 'room-a';
    jam = { moderators: ['moderator'], waitingRoom: true };
    mockWaitingRoom = undefined;
    mockWaitingRoomOnError = undefined;
    showToast = vi.fn();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured = undefined;
  });

  it('does not burst-announce the first snapshot of a new occurrence', () => {
    // Room A: a guest is already waiting — establishes the baseline.
    mockWaitingRoom = { a: entry('alice') };
    mount();
    expect(showToast).not.toHaveBeenCalled();

    // Switch occurrences without unmounting: room B's first snapshot already
    // contains Bob, who was never seen in room B. Without the reset effect he
    // would be announced as "joined" against room A's baseline.
    mockJamPostId = 'room-b';
    mockWaitingRoom = { b: entry('bob') };
    rerender();
    expect(showToast).not.toHaveBeenCalled();

    // And a real join in the new room is still announced.
    mockWaitingRoom = {
      b: entry('bob'),
      c: entry('carol'),
    };
    rerender();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0]?.[0]).toBe(
      'jams.waitingRoom.joinedToastOne:1',
    );
  });

  it('re-baselines when the waiting-room gate toggles off and back on', () => {
    mockWaitingRoom = { a: entry('alice') };
    mount();
    expect(showToast).not.toHaveBeenCalled();
    expect(captured?.waitingRoomCount).toBe(1);

    // Gate off: the stream id becomes '' and the hook's state clears.
    jam = { moderators: ['moderator'], waitingRoom: false };
    mockWaitingRoom = undefined;
    rerender();
    expect(captured?.waitingRoomCount).toBe(0);

    // Gate back on: the same pre-existing guest returns as the first
    // snapshot and must not be announced as a new join.
    jam = { moderators: ['moderator'], waitingRoom: true };
    mockWaitingRoom = { a: entry('alice') };
    rerender();
    expect(showToast).not.toHaveBeenCalled();
  });
});

// The waiting-room stream's non-2xx failure (auth expiry, 4xx/5xx) must
// surface through the caller's error toast channel instead of silently
// staling the join/leave baseline (review suggestion 3).
describe('useJamFooterControls waiting-room stream error', () => {
  let showToast: (message: string) => void;
  let onError: (message: string) => void;
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  // A single stable component type so re-renders update the existing fiber
  // (a remount would re-create the hook and defeat the stability pin).
  const Host = () => {
    useJamFooterControls({
      room: { localParticipant: { identity: 'moderator' } } as never,
      participantCount: 1,
      confirmStopRecording: () => true,
      onSuccess: () => {},
      onError,
      showToast,
    });
    return null;
  };

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(createElement(Host));
    });
  };

  const rerender = () => {
    act(() => {
      root?.render(createElement(Host));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockJamPostId = 'room-a';
    jam = { moderators: ['moderator'], waitingRoom: true };
    mockWaitingRoom = undefined;
    mockWaitingRoomOnError = undefined;
    showToast = vi.fn();
    onError = vi.fn();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('routes a 401 stream failure to the caller error toast, mapped (not the raw key)', () => {
    mount();
    expect(mockWaitingRoomOnError).toBeTypeOf('function');

    act(() => {
      mockWaitingRoomOnError?.({
        status: 401,
        key: 'error.jamGuestPassRequired',
      });
    });
    // The key is left bare for the t-resolver (the source never hands
    // `error.*` keys a defaultValue), so real i18n renders the guest-pass
    // copy; the shared mock resolves the same key the same way. The raw key
    // is never what reaches the toast.
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      'Sign in, or create a guest pass, to join this jam.',
    );
    // A message-only failure (no key) surfaces the server message.
    act(() => {
      mockWaitingRoomOnError?.({ status: 503, message: 'bad gateway' });
    });
    expect(onError).toHaveBeenCalledWith('bad gateway');
    // A keyless, messageless failure (no body to parse) falls back to the
    // streamError copy the source resolves before calling apiErrorMessage.
    act(() => {
      mockWaitingRoomOnError?.({ status: 503 });
    });
    expect(onError).toHaveBeenCalledWith('Unable to reach the waiting room');
    // Join announcements are unaffected: the error is side-band.
    expect(showToast).not.toHaveBeenCalled();
  });

  it('hands the stream a referentially stable onError across renders', () => {
    mount();
    const firstOnError = mockWaitingRoomOnError;
    expect(firstOnError).toBeTypeOf('function');
    rerender();
    expect(mockWaitingRoomOnError).toBe(firstOnError);
  });
});
