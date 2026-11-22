/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJamPeople } from './useJamPeople';
import { useJamParticipantRemove } from './useJamParticipant';

// The hooks read i18n / identity / api / jam context, none of which are
// exercised here — mock each to a bare minimum.
const tMock = vi.fn((key: string, _opts?: unknown) => key);

let liftBanAction: () => Promise<unknown>;
let removeParticipantAction: (payload: unknown) => Promise<unknown>;

vi.mock('../../i18n', () => ({
  useT: () => tMock,
  useI18n: () => ({ i18n: {}, t: tMock }),
}));
vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'moderator' }),
}));
vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useWaitingRoomStream: () => undefined,
      admitParticipantAction: () => vi.fn(async () => ({})),
      liftJamBanAction: () => liftBanAction,
      removeJamParticipantAction: () => removeParticipantAction,
    },
  }),
}));
vi.mock('../../components/jams/JamContext', () => ({
  useJamContext: () => ({
    jamPost: { id: 'jam1' },
    jam: { id: 'jam1', moderators: ['moderator'], waitingRoom: false },
    occurrence: undefined,
  }),
}));
vi.mock('../../components/jams/useJamHands', () => ({
  useRaisedHands: () => new Set<string>(),
}));
vi.mock('../../components/jams/jamEventActions', () => ({
  parseParticipantMetadata: () => ({ profile: { id: 'x', displayName: 'X' } }),
}));

const room = { localParticipant: { identity: 'moderator' } } as never;
const participant = {
  identity: 'member1',
  getTrackPublications: () => [],
} as never;

let onLiftError: (message: string) => void;
let captured: ReturnType<typeof useJamPeople> | undefined;
let root: Root | undefined;
let container: HTMLDivElement | undefined;

const PeopleHost = () => {
  captured = useJamPeople({ room, participants: [], onLiftError });
  return null;
};

const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(createElement(PeopleHost));
  });
};

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  onLiftError = vi.fn();
  liftBanAction = vi.fn(async () => ({}));
  removeParticipantAction = vi.fn(async () => ({}));
  tMock.mockClear();
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

describe('useJamPeople liftBan', () => {
  it('sets liftingId during an in-flight liftBan and clears it in finally (success)', async () => {
    let resolveLift!: () => void;
    liftBanAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLift = resolve;
        }),
    );
    mount();
    expect(captured?.liftingId).toBeNull();

    let inFlight: Promise<unknown> | undefined;
    await act(async () => {
      inFlight = captured?.liftBan('member1');
    });
    // In flight: the button should be disabled for member1.
    expect(captured?.liftingId).toBe('member1');

    await act(async () => {
      resolveLift();
      await inFlight;
    });
    // Cleared in finally once settled.
    expect(captured?.liftingId).toBeNull();
  });

  it('clears liftingId in finally even when the liftBan rejects', async () => {
    liftBanAction = vi.fn(async () => {
      throw new Error('boom');
    });
    mount();
    await act(async () => {
      await captured?.liftBan('member1');
    });
    expect(captured?.liftingId).toBeNull();
  });

  it('routes a failed liftBan to onLiftError with the unbanError key', async () => {
    liftBanAction = vi.fn(async () => {
      throw new Error('network');
    });
    mount();
    await act(async () => {
      await captured?.liftBan('member1');
    });
    expect(onLiftError).toHaveBeenCalledTimes(1);
    expect(onLiftError).toHaveBeenCalledWith('jams.people.unbanError');
  });

  it('does not call onLiftError on a successful liftBan', async () => {
    liftBanAction = vi.fn(async () => ({}));
    mount();
    await act(async () => {
      await captured?.liftBan('member1');
    });
    expect(onLiftError).not.toHaveBeenCalled();
  });
});

describe('useJamParticipantRemove toast routing', () => {
  let onSuccess: (m: string) => void;
  let onError: (m: string) => void;
  let capturedRemove: (() => Promise<void>) | undefined;
  let removeRoot: Root | undefined;
  let removeContainer: HTMLDivElement | undefined;

  const RemoveHost = () => {
    capturedRemove = useJamParticipantRemove({
      participant,
      onSuccess,
      onError,
    });
    return null;
  };

  const mountRemove = () => {
    removeContainer = document.createElement('div');
    document.body.appendChild(removeContainer);
    removeRoot = createRoot(removeContainer);
    act(() => {
      removeRoot.render(createElement(RemoveHost));
    });
  };

  beforeEach(() => {
    onSuccess = vi.fn();
    onError = vi.fn();
  });

  afterEach(() => {
    act(() => {
      removeRoot?.unmount();
    });
    removeContainer?.remove();
    removeRoot = undefined;
    removeContainer = undefined;
    capturedRemove = undefined;
  });

  it('routes a successful remove to onSuccess with removeSuccess', async () => {
    removeParticipantAction = vi.fn(async () => ({}));
    mountRemove();
    await act(async () => {
      await capturedRemove?.();
    });
    expect(onSuccess).toHaveBeenCalledWith('jams.participants.removeSuccess');
    expect(onError).not.toHaveBeenCalled();
  });

  it('routes a failed remove to onError with removeError', async () => {
    removeParticipantAction = vi.fn(async () => {
      throw new Error('nope');
    });
    mountRemove();
    await act(async () => {
      await capturedRemove?.();
    });
    expect(onError).toHaveBeenCalledWith('jams.participants.removeError');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
