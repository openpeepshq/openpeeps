/** @vitest-environment jsdom */
/**
 * Direct coverage of the removed-from-jam state in `useJamRoom` — the
 * round-14 review (issue #303, comment 34513, suggestion 1) noted this is
 * the only load-bearing removal logic in the PR with no direct coverage:
 * every render test mocks `useJamRoom` wholesale. Here both flag sources
 * are exercised without render mocks:
 *
 * - `isBanned`, derived from the refetched post's `jam.banned` list
 *   (including the `!observer` guard and the `type === 'event'` check),
 * - the terminal `handleDisconnected(PARTICIPANT_REMOVED)` branch,
 * - the merged output `removedFromJam: removedFromJam || isBanned`.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DisconnectReason } from 'livekit-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJamRoom } from './useJamRoom';

const tMock = vi.fn((key: string, _opts?: unknown) => key);

let me: { id: string } | undefined;
let contextValue: {
  jamPost: { id: string };
  jam: { moderators: string[]; waitingRoom: boolean };
  jamEvent: unknown;
  observer: boolean;
  occurrence?: string;
  isIntentionalLeave: () => boolean;
};
let postData: { type: string; jam?: { banned?: string[] } } | undefined;
let jamState: { active: boolean };
let tokenMock: ReturnType<typeof vi.fn>;

vi.mock('../../i18n', () => ({
  useT: () => tMock,
}));
vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () => me,
}));
vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useJamState: () => ({ data: jamState }),
      usePost: () => ({ data: postData ? { data: postData } : undefined }),
      rsvpToEventAction: () => vi.fn(),
    },
    client: {
      jams: { token: tokenMock },
    },
  }),
}));
vi.mock('../../components/server-data/context', () => ({
  useServerInfo: () => ({
    jams: { livekit: { url: 'https://livekit.example.org', enabled: true } },
  }),
}));
vi.mock('../../components/jams/JamContext', () => ({
  useJamContext: () => contextValue,
}));
vi.mock('@openpeepshq/common/lib', () => ({
  getJamCapacityJoinBlock: () => ({ blocked: false }),
}));

let captured: ReturnType<typeof useJamRoom> | undefined;
let root: Root | undefined;
let container: HTMLDivElement | undefined;

const RoomHost = () => {
  captured = useJamRoom();
  return null;
};

const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(createElement(RoomHost));
  });
};

const join = () => {
  act(() => {
    captured?.handleJoin({
      token: 'tok',
      livekitUrl: 'https://livekit.example.org',
    });
  });
};

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  me = { id: 'me1' };
  contextValue = {
    jamPost: { id: 'jam1' },
    jam: { moderators: ['mod1'], waitingRoom: false },
    jamEvent: undefined,
    observer: false,
    occurrence: undefined,
    isIntentionalLeave: () => false,
  };
  postData = undefined;
  jamState = { active: true };
  tokenMock = vi.fn(() => new Promise(() => {}));
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

describe('useJamRoom removed-from-jam state', () => {
  it('flags the room as removed when the refetched post bans the current profile', () => {
    postData = { type: 'event', jam: { banned: ['me1'] } };
    mount();
    expect(captured?.removedFromJam).toBe(true);
  });

  it('stays not-removed when the banned list does not contain the current profile', () => {
    postData = { type: 'event', jam: { banned: ['someone-else'] } };
    mount();
    expect(captured?.removedFromJam).toBe(false);
  });

  it('does not flag a banned observer (observers cannot be removed from the jam)', () => {
    contextValue = { ...contextValue, observer: true };
    postData = { type: 'event', jam: { banned: ['me1'] } };
    mount();
    expect(captured?.removedFromJam).toBe(false);
  });

  it('does not treat a non-event post as a ban source', () => {
    postData = { type: 'status', jam: { banned: ['me1'] } };
    mount();
    expect(captured?.removedFromJam).toBe(false);
  });

  it('flags the room as removed on a terminal PARTICIPANT_REMOVED disconnect and clears the connection', async () => {
    mount();
    join();
    expect(captured?.connection).toBeDefined();
    expect(captured?.removedFromJam).toBe(false);

    await act(async () => {
      captured?.handleDisconnected(
        DisconnectReason.PARTICIPANT_REMOVED as DisconnectReason,
      );
    });
    expect(captured?.removedFromJam).toBe(true);
    expect(captured?.connection).toBeUndefined();
    // Terminal: no reconnect token request.
    expect(tokenMock).not.toHaveBeenCalled();
  });

  it('does not flag removal on a transient disconnect (the ban flag is still merged in)', async () => {
    postData = { type: 'event', jam: { banned: ['me1'] } };
    mount();
    join();

    await act(async () => {
      captured?.handleDisconnected(DisconnectReason.SERVER_SHUTDOWN);
    });
    // Transient: the removed flag must come solely from the ban list merge,
    // and the connection is torn down for the reconnect path.
    expect(captured?.removedFromJam).toBe(true);
    expect(captured?.connection).toBeUndefined();
    expect(captured?.reconnectPrefs).toEqual({ audio: true, video: true });
  });

  it('stays not-removed on a transient disconnect when the post does not ban the profile', async () => {
    mount();
    join();

    await act(async () => {
      captured?.handleDisconnected(DisconnectReason.SERVER_SHUTDOWN);
    });
    expect(captured?.removedFromJam).toBe(false);
  });
});
