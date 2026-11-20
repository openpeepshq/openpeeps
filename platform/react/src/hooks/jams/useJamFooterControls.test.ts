/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type JamWaitingRoomEntry } from '@openpeepshq/common/types';
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
      useWaitingRoomStream: () => mockWaitingRoom,
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

const tMock = (key: string, opts?: { count?: number }) =>
  opts ? `${key}:${opts.count}` : key;

// Module scope so the vi.mock factories above can read the current values.
let mockJamPostId: string;
let jam: { moderators: string[]; waitingRoom: boolean };
let mockWaitingRoom: Record<string, JamWaitingRoomEntry> | undefined;

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
