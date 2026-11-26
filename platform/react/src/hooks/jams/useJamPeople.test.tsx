/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitingRoomTMock } from '../../test/support/waitingRoomTMock';
import { useJamPeople } from './useJamPeople';

// Only the two things that leave the hook are stubbed: the admit/reject
// actions (the endpoint calls) and the toast callbacks the caller supplies.
// Every other dependency is mocked to a minimal, deterministic shape.
const { rejectAction, admitAction, waitingRoomOnErrorRef } = vi.hoisted(() => ({
  rejectAction: vi.fn(async () => undefined),
  admitAction: vi.fn(async () => undefined),
  // Captures the referentially-stable `onError` the hook hands the
  // waiting-room stream, so a test can drive a non-2xx failure.
  waitingRoomOnErrorRef: {
    current: undefined as ((e: unknown) => void) | undefined,
  },
}));

// The waiting-room stream snapshot the hook reads (`undefined` = no
// snapshot yet). Module scope so the `useOpenpeeps` mock factory above can
// read the current value on each render.
let mockWaitingRoom: Record<string, { displayName: string }> | undefined;

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useWaitingRoomStream: (
        _id: unknown,
        _occ: unknown,
        onError?: (e: unknown) => void,
      ) => {
        waitingRoomOnErrorRef.current = onError;
        return mockWaitingRoom;
      },
      admitParticipantAction: () => admitAction,
      rejectParticipantAction: () => rejectAction,
      // Present on the merged hook (main's lift-ban feature); never invoked by
      // these waiting-room cases, so a no-op stub keeps the mock complete.
      liftJamBanAction: () => vi.fn(),
    },
  }),
}));

vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'mod-1' }),
}));

vi.mock('../../components/jams/JamContext', () => ({
  useJamContext: () => ({
    jamPost: { id: 'post1' },
    jam: { moderators: ['mod-1'], waitingRoom: true },
    occurrence: undefined,
  }),
}));

vi.mock('../../components/jams/useJamHands', () => ({
  useRaisedHands: () => new Set<string>(),
}));

vi.mock('../../i18n', () => {
  // Shared waiting-room t-mock (mirrors the source's t-calls): the
  // `jams.waitingRoom.*` fallback resolves to its en.json value and bare
  // `error.*` keys pass through raw for the resolver — same semantics as
  // real i18n, so the stream-error assertions exercise the real key→copy
  // mapping through the real `apiErrorMessage`.
  return {
    useT: () => waitingRoomTMock,
  };
});

describe('useJamPeople waiting-room actions', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let result: ReturnType<typeof useJamPeople> | undefined;
  let onActionSuccess: (message: string) => void;
  let onActionError: (message: string) => void;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    rejectAction.mockClear();
    admitAction.mockClear();
    onActionSuccess = vi.fn() as (message: string) => void;
    onActionError = vi.fn() as (message: string) => void;
    mockWaitingRoom = undefined;
    waitingRoomOnErrorRef.current = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    result = undefined;
  });

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const newRoot = createRoot(container);
    root = newRoot;
    const Host = () => {
      result = useJamPeople({
        room: undefined as unknown as Parameters<
          typeof useJamPeople
        >[0]['room'],
        participants: [],
        onActionSuccess,
        onActionError,
      });
      return null;
    };
    act(() => {
      newRoot.render(createElement(Host));
    });
  };

  it('admit calls the admit endpoint and surfaces success', async () => {
    mount();
    await act(async () => {
      await result?.admit({ id: 'guest1' });
    });
    expect(admitAction).toHaveBeenCalledTimes(1);
    expect(admitAction).toHaveBeenCalledWith(
      { id: 'post1', profileId: 'guest1' },
      undefined,
    );
    expect(onActionSuccess).toHaveBeenCalledWith(
      'Participant admitted successfully',
    );
    expect(onActionError).not.toHaveBeenCalled();
    // The admit and reject busy states are separate: admitting did not
    // touch the reject busy id.
    expect(result?.admittingId).toBe(null);
    expect(result?.rejectingId).toBe(null);
  });

  it('surfaces onActionError when the admit endpoint fails', async () => {
    admitAction.mockRejectedValueOnce(new Error('boom'));
    mount();
    await act(async () => {
      await result?.admit({ id: 'guest1' });
    });
    expect(onActionError).toHaveBeenCalledWith('Failed to admit participant');
    expect(onActionSuccess).not.toHaveBeenCalled();
  });

  it('reject calls the reject endpoint and surfaces success', async () => {
    mount();
    await act(async () => {
      await result?.reject({ id: 'guest1' });
    });
    expect(rejectAction).toHaveBeenCalledTimes(1);
    expect(rejectAction).toHaveBeenCalledWith(
      { id: 'post1', profileId: 'guest1' },
      undefined,
    );
    expect(onActionSuccess).toHaveBeenCalledWith(
      'Participant rejected successfully',
    );
    expect(onActionError).not.toHaveBeenCalled();
  });

  it('surfaces onActionError when the reject endpoint fails', async () => {
    rejectAction.mockRejectedValueOnce(new Error('boom'));
    mount();
    await act(async () => {
      await result?.reject({ id: 'guest1' });
    });
    expect(onActionError).toHaveBeenCalledWith('Failed to reject participant');
    expect(onActionSuccess).not.toHaveBeenCalled();
  });
});

describe('useJamPeople waiting-room stream error (non-terminal, clears on recovery)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let result: ReturnType<typeof useJamPeople> | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockWaitingRoom = undefined;
    waitingRoomOnErrorRef.current = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    result = undefined;
  });

  // A single stable component type, so repeated `rerender()` calls update the
  // existing fiber instead of swapping the type and remounting — a remount
  // would hand the stream a new `onError` identity and defeat the stability
  // assertion (same pattern as the footer baseline-reset tests).
  const Host = () => {
    result = useJamPeople({
      room: undefined as unknown as Parameters<typeof useJamPeople>[0]['room'],
      participants: [],
    });
    return null;
  };

  const mount = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const newRoot = createRoot(container);
    root = newRoot;
    act(() => {
      newRoot.render(createElement(Host));
    });
  };

  const rerender = () =>
    act(() => {
      root?.render(createElement(Host));
    });

  it('hands the stream a referentially stable onError and sets waitingRoomError from a 401', () => {
    mount();
    expect(waitingRoomOnErrorRef.current).toBeTypeOf('function');
    const firstOnError = waitingRoomOnErrorRef.current;
    expect(result?.waitingRoomError).toBeNull();

    act(() => {
      firstOnError?.({
        status: 401,
        key: 'error.jamGuestPassRequired',
      });
    });
    // The SseError key is translated through the shared mapping, not shown raw.
    expect(result?.waitingRoomError).toBe(
      'Sign in, or create a guest pass, to join this jam.',
    );

    // A re-render must not hand the stream a new `onError` identity (that
    // would tear the connection down) and must not change the error.
    rerender();
    expect(waitingRoomOnErrorRef.current).toBe(firstOnError);
    expect(result?.waitingRoomError).toBe(
      'Sign in, or create a guest pass, to join this jam.',
    );
  });

  it('clears the waiting-room error when a fresh snapshot arrives', () => {
    mount();
    act(() => {
      waitingRoomOnErrorRef.current?.({
        status: 503,
        message: 'bad gateway',
      });
    });
    expect(result?.waitingRoomError).toBe('bad gateway');

    mockWaitingRoom = { guest1: { displayName: 'Guest One' } };
    rerender();
    expect(result?.waitingRoomError).toBeNull();
    // The recovered snapshot still flows through to the drawer rows.
    expect(result?.waitingProfiles).toHaveLength(1);
  });

  it('falls back to the streamError copy for a keyless, messageless failure', () => {
    mount();
    act(() => {
      waitingRoomOnErrorRef.current?.({ status: 503 });
    });
    // No body to parse: the source resolves the streamError fallback through
    // the resolver before calling apiErrorMessage, so the copy (never the
    // raw key) is what the drawer renders.
    expect(result?.waitingRoomError).toBe('Unable to reach the waiting room');
  });
});
