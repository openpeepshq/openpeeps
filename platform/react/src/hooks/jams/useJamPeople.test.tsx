/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJamPeople } from './useJamPeople';

// Only the two things that leave the hook are stubbed: the admit/reject
// actions (the endpoint calls) and the toast callbacks the caller supplies.
// Every other dependency is mocked to a minimal, deterministic shape.
const { rejectAction, admitAction } = vi.hoisted(() => ({
  rejectAction: vi.fn(async () => undefined),
  admitAction: vi.fn(async () => undefined),
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useWaitingRoomStream: () => undefined,
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
  // Resolve the waiting-room toast keys to their en.json strings (mirrors
  // real i18n) so the toast assertions below are meaningful — the hook
  // calls t() bare, without defaultValue.
  const waitingRoomToasts: Record<string, string> = {
    'jams.waitingRoom.admitSuccess': 'Participant admitted successfully',
    'jams.waitingRoom.admitError': 'Failed to admit participant',
    'jams.waitingRoom.rejectSuccess': 'Participant rejected successfully',
    'jams.waitingRoom.rejectError': 'Failed to reject participant',
  };
  return {
    useT: () => (key: string) => waitingRoomToasts[key] ?? key,
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
