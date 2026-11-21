/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { usePostReactionToggle } from './usePostReactionToggle';

const mocks = vi.hoisted(() => ({
  reactFn: vi.fn(async () => ({ success: true })),
  retractFn: vi.fn(async () => ({ success: true })),
  me: { id: 'me-1' },
  canReact: true,
  // default stub args; a specific case feeds the real
  // getPostActionAvailability (importOriginal) and the authData it needs
  useRealAvailability: false,
  authData: {} as Record<string, unknown>,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      reactToPostAction: () => mocks.reactFn,
      retractPostReactionAction: () => mocks.retractFn,
    },
  }),
}));

vi.mock('../../components/layout/IdentityContext', () => ({
  useAuthData: () => mocks.authData,
  useCurrentProfile: () => mocks.me,
}));

vi.mock('../../components/server-data', () => ({
  useCapabilities: () => ({}),
}));

vi.mock('@openpeepshq/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openpeepshq/common')>();
  return {
    ...actual,
    getPostActionAvailability: (
      authData: Parameters<typeof actual.getPostActionAvailability>[0],
      post: Parameters<typeof actual.getPostActionAvailability>[1],
      config: Parameters<typeof actual.getPostActionAvailability>[2],
    ) =>
      mocks.useRealAvailability
        ? actual.getPostActionAvailability(authData, post, config)
        : {
            canReply: true,
            canRepost: true,
            canReact: mocks.canReact,
          },
  };
});

const makePost = (
  reactions: Array<{ reaction: string; profile: { id: string } }>,
  extra: Partial<PublicPost> = {},
): PublicPost =>
  ({
    id: 'post-1',
    visibility: 'direct',
    reactions,
    ...extra,
  }) as unknown as PublicPost;

let hookResult: ReturnType<typeof usePostReactionToggle> | undefined;
const Probe = ({ post }: { post: PublicPost }) => {
  hookResult = usePostReactionToggle(post);
  return null;
};

describe('usePostReactionToggle (DM bubble) reactions', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.canReact = true;
    mocks.useRealAvailability = false;
    mocks.authData = {};
    mocks.reactFn.mockClear();
    mocks.retractFn.mockClear();
    hookResult = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const renderHook = (post: PublicPost) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const newRoot = createRoot(container);
    root = newRoot;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    act(() => {
      newRoot.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Probe, { post }),
        ),
      );
    });
    return hookResult as ReturnType<typeof usePostReactionToggle>;
  };

  it('adds the default thumbs up when the profile has not reacted', async () => {
    const result = renderHook(makePost([]));

    await act(async () => {
      await result.toggleReaction();
    });

    expect(mocks.reactFn).toHaveBeenCalledWith({ reaction: '👍' });
    expect(mocks.retractFn).not.toHaveBeenCalled();
  });

  it('retracts the profile own non-default reaction (not the thumbs up) on a second tap', async () => {
    const result = renderHook(
      makePost([{ reaction: '❤️', profile: { id: 'me-1' } }]),
    );

    expect(result.iReacted).toBe(true);

    await act(async () => {
      await result.toggleReaction();
    });

    expect(mocks.retractFn).toHaveBeenCalledWith(
      undefined,
      { reaction: '❤️' },
      undefined,
    );
    expect(mocks.reactFn).not.toHaveBeenCalled();
  });

  it('retracts the most recent own reaction when the profile has several', async () => {
    // Server returns reactions chronologically; the last entry is the latest.
    const result = renderHook(
      makePost([
        { reaction: '👍', profile: { id: 'me-1' } },
        { reaction: '❤️', profile: { id: 'someone-else' } },
        { reaction: '🎉', profile: { id: 'me-1' } },
      ]),
    );

    expect(result.myReactions).toEqual(['👍', '🎉']);

    await act(async () => {
      await result.toggleReaction();
    });

    expect(mocks.retractFn).toHaveBeenCalledWith(
      undefined,
      { reaction: '🎉' },
      undefined,
    );
    expect(mocks.reactFn).not.toHaveBeenCalled();
  });

  it('keeps the button active after the capability lapses so a reaction is never stuck', async () => {
    mocks.canReact = false;
    const result = renderHook(
      makePost([{ reaction: '❤️', profile: { id: 'me-1' } }]),
    );

    expect(result.iReacted).toBe(true);
    expect(result.canReact).toBe(true);

    await act(async () => {
      await result.toggleReaction();
    });

    expect(mocks.retractFn).toHaveBeenCalledWith(
      undefined,
      { reaction: '❤️' },
      undefined,
    );
    expect(mocks.reactFn).not.toHaveBeenCalled();
  });

  it('does nothing when the capability lapses and the profile has not reacted', async () => {
    mocks.canReact = false;
    const result = renderHook(makePost([]));

    expect(result.canReact).toBe(false);

    await act(async () => {
      await result.toggleReaction();
    });

    expect(mocks.reactFn).not.toHaveBeenCalled();
    expect(mocks.retractFn).not.toHaveBeenCalled();
  });

  it('derives canReact from the real getPostActionAvailability (non-member of a group post)', async () => {
    // Exercises the real hook→capability plumbing (not the constant stub):
    // a group post with no membership returns canReact=false from
    // getPostActionAvailability, so the DM trigger is inert.
    mocks.useRealAvailability = true;
    mocks.authData = { profile: { id: 'me-1', memberships: [] } };
    const post = makePost([], {
      groupId: 'group-1',
      group: { id: 'group-1' },
    } as never);
    const result = renderHook(post);

    expect(result.canReact).toBe(false);

    await act(async () => {
      await result.toggleReaction();
    });

    expect(mocks.reactFn).not.toHaveBeenCalled();
    expect(mocks.retractFn).not.toHaveBeenCalled();
  });
});
