/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { openpeepsClient } from '@openpeepshq/client';
import type { JamEvent, PostWithMeta } from '@openpeepshq/common/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jamHooks } from '../../contexts/openpeeps/hooks/jams';
import { useJamChat } from './useJamChat';

// Pins the client-side delete gate in `useJamChat.canDeleteMessage` (issue
// #1587) — the cosmetic twin of the server gate in `deleteJamEvent`: the
// viewer may delete a chat `message` only when they are the jam host, a
// moderator in `jam.moderators`, or the message author; never when
// `readOnly`, never for non-message event types, and never without a signed-in
// profile. The real `jamFromEvent` is used (it only reads the post's data), so
// a regression that drops the host check or the moderator check fails here.
// Each case mounts a fresh root against the viewer it names and reads the
// gate's boolean back during render (the value is a `useCallback` keyed on
// the profile/post/readOnly deps).
let currentProfile: { id: string } | undefined;
let jamPost: PostWithMeta;
let mockReadOnly = false;
let removeJamEventMock: ReturnType<typeof vi.fn>;
// Spy on the real client `remove` endpoint for the invalidation test below.
let removeSpy: ReturnType<typeof vi.fn>;

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfile: () => ({ data: currentProfile }),
      useInfiniteJamEvents: () => ({ data: undefined, isLoading: false }),
      removeJamEventAction: () => removeJamEventMock,
    },
  }),
}));

vi.mock('../../components/jams/JamContext', () => ({
  useJamContext: () => ({ jamPost }),
}));

vi.mock('../../components/jams/JamEventsContext', () => ({
  useJamEventsContext: () => ({
    sessionEvents: [],
    sendMessage: vi.fn(),
    removeSessionEvent: vi.fn(),
  }),
}));

vi.mock('../../components/jams/jamEventActions', () => ({
  mentionProfilesFromParticipants: () => [],
}));

const message: JamEvent = {
  id: 'evt-1',
  jamId: 'jam-1',
  profileId: 'author-1',
  type: 'message',
  createdAt: '2026-11-22T20:00:00.000Z',
  updatedAt: '2026-11-22T20:00:00.000Z',
} as JamEvent;

const makePost = (profileId: string, moderators: string[]): PostWithMeta =>
  ({
    id: 'jam-1',
    profile: { id: profileId },
    data: {
      type: 'event',
      jam: { moderators, videoEnabled: true, type: 'video-call' },
    },
  }) as unknown as PostWithMeta;

describe('useJamChat canDeleteMessage (issue #1587)', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let allowed = false;
  let removeMessage: (id: string) => Promise<void> = async () => undefined;

  const CaptureHost = () => {
    const value = useJamChat({ participants: [], readOnly: mockReadOnly });
    allowed = value.canDeleteMessage(message);
    removeMessage = value.removeMessage;
    return null;
  };

  const mount = () => {
    const div = document.createElement('div');
    container = div;
    document.body.appendChild(div);
    act(() => {
      root = createRoot(div);
      root.render(createElement(CaptureHost));
    });
  };

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  const runAs = (
    viewer: string | undefined,
    opts: { readOnly?: boolean } = {},
  ) => {
    currentProfile = viewer ? { id: viewer } : undefined;
    jamPost = makePost('host-1', ['mod-1']);
    mockReadOnly = opts.readOnly ?? false;
    allowed = false;
    mount();
    return allowed;
  };

  it('allows the host to delete any participant message', () => {
    expect(runAs('host-1')).toBe(true);
  });

  it('allows a moderator from jam.moderators', () => {
    expect(runAs('mod-1')).toBe(true);
  });

  it('allows the message author', () => {
    expect(runAs('author-1')).toBe(true);
  });

  it('refuses a plain participant who is neither host, moderator, nor author', () => {
    expect(runAs('viewer-1')).toBe(false);
  });

  it('refuses non-message event types even for the host', () => {
    currentProfile = { id: 'host-1' };
    jamPost = makePost('host-1', ['mod-1']);
    mockReadOnly = false;
    allowed = true;
    const Host = () => {
      const { canDeleteMessage } = useJamChat({
        participants: [],
        readOnly: mockReadOnly,
      });
      allowed = canDeleteMessage({ ...message, type: 'join' } as JamEvent);
      return null;
    };
    const div = document.createElement('div');
    container = div;
    document.body.appendChild(div);
    act(() => {
      root = createRoot(div);
      root.render(createElement(Host));
    });
    expect(allowed).toBe(false);
  });

  it('refuses when the viewer is not signed in', () => {
    expect(runAs(undefined)).toBe(false);
  });

  it('refuses an observer (readOnly) even when they are the author', () => {
    expect(runAs('author-1', { readOnly: true })).toBe(false);
  });

  it('removeMessage deletes via the client endpoint', async () => {
    currentProfile = { id: 'author-1' };
    jamPost = makePost('host-1', ['mod-1']);
    removeJamEventMock = vi.fn().mockResolvedValue(true);
    mockReadOnly = false;
    mount();
    await act(async () => {
      await removeMessage('evt-1');
    });
    expect(removeJamEventMock).toHaveBeenCalledWith({
      id: 'jam-1',
      eventJamEventId: 'evt-1',
    });
  });

  // Pins the cross-client fan-out that makes the plan's "every client picks up
  // the removal on its next refetch" true: `removeJamEventAction` must be wired
  // in the real `jamHooks` to invalidate the `['jams']` query-key prefix, so
  // `useInfiniteJamEvents` (and other clients' next poll) refetch and drop the
  // message. Asserts the *production* wiring — a refactor that renames or
  // removes the `['jams']` key in `hooks/jams.ts` fails here, not just in prod.
  it('removeJamEventAction invalidates the [jams] query prefix (cross-client removal)', async () => {
    // `openpeepsClient()` without a baseUrl: the unrelated background queries
    // jamHooks issues at render fail in jsdom (react-query swallows them);
    // only the spied `remove` endpoint's response matters here.
    const client = openpeepsClient();
    removeSpy = vi
      .spyOn(client.jams.events, 'remove')
      .mockResolvedValue({ data: true } as never);

    const queryClient = new QueryClient({
      // Never refetch on invalidate during the test; keeps the assertion on
      // `invalidateQueries` deterministic.
      defaultOptions: { queries: { retry: false } },
    });

    const invalidateSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    let removeJamEvent:
      | ((pathParams?: {
          id: string;
          eventJamEventId: string;
        }) => Promise<unknown>)
      | undefined;

    const Host = () => {
      // `jamHooks(client)` construction is pure; the action's curried call
      // (which reads `QueryClientContext`) must run during render, exactly
      // like `useJamChat` does.
      const api = jamHooks(client);
      removeJamEvent = api.removeJamEventAction();
      return null;
    };

    const div = document.createElement('div');
    container = div;
    document.body.appendChild(div);
    await act(async () => {
      root = createRoot(div);
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Host),
        ),
      );
    });

    await act(async () => {
      await removeJamEvent?.({ id: 'jam-1', eventJamEventId: 'evt-1' });
    });

    expect(removeSpy).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['jams'] });
  });
});
