/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { useFeedPostActions } from './useFeedPostActions';

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
      useCurrentProfileReposts: () => ({ data: undefined, refetch: vi.fn() }),
      reactToPostAction: () => mocks.reactFn,
      retractPostReactionAction: () => mocks.retractFn,
      repostPostAction: () => vi.fn(),
      deletePostAction: () => vi.fn(),
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

vi.mock('./replyOpener', () => ({
  useReplyOpener: () => vi.fn(),
}));

const makePost = (
  reactions: Array<{ reaction: string; profile: { id: string } }>,
  extra: Partial<PublicPost> = {},
): PublicPost =>
  ({
    id: 'post-1',
    reactions,
    ...extra,
  }) as unknown as PublicPost;

let hookResult: ReturnType<typeof useFeedPostActions> | undefined;
const Probe = ({ post }: { post: PublicPost }) => {
  hookResult = useFeedPostActions(post);
  return null;
};

describe('useFeedPostActions reactions', () => {
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
    return hookResult as ReturnType<typeof useFeedPostActions>;
  };

  it('adds the picked reaction instead of a hard-coded thumbs up', async () => {
    const result = renderHook(makePost([]));

    await act(async () => {
      await result.toggleReaction('❤️');
    });

    expect(mocks.reactFn).toHaveBeenCalledWith({ reaction: '❤️' });
    expect(mocks.retractFn).not.toHaveBeenCalled();
  });

  it('retracts the picked emoji when the profile already reacted with it', async () => {
    const result = renderHook(
      makePost([{ reaction: '❤️', profile: { id: 'me-1' } }]),
    );

    expect(result.myReactions).toEqual(['❤️']);

    await act(async () => {
      await result.toggleReaction('❤️');
    });

    expect(mocks.retractFn).toHaveBeenCalledWith(
      undefined,
      { reaction: '❤️' },
      undefined,
    );
    expect(mocks.reactFn).not.toHaveBeenCalled();
  });

  it('retracts only the picked emoji when the profile has several reactions', async () => {
    const result = renderHook(
      makePost([
        { reaction: '👍', profile: { id: 'me-1' } },
        { reaction: '👍', profile: { id: 'someone-else' } },
        { reaction: '❤️', profile: { id: 'me-1' } },
      ]),
    );

    await act(async () => {
      await result.toggleReaction('👍');
    });

    expect(mocks.retractFn).toHaveBeenCalledWith(
      undefined,
      { reaction: '👍' },
      undefined,
    );
    expect(mocks.reactFn).not.toHaveBeenCalled();
  });

  it('does not add a reaction without the capability', async () => {
    mocks.canReact = false;
    const result = renderHook(makePost([]));

    await act(async () => {
      await result.toggleReaction('❤️');
    });

    expect(mocks.reactFn).not.toHaveBeenCalled();
    expect(mocks.retractFn).not.toHaveBeenCalled();
  });

  it('stays able to un-react from the footer when the capability lapses but the profile already reacted', async () => {
    // core-posts-react revoked (or the profile left the group) while the post
    // and its own reaction stay visible: canReact=false from the capability
    // check, but the exposed trigger must remain open so the reaction is not
    // stuck. Mirrors usePostReactionToggle's `canReact || iReacted`.
    mocks.canReact = false;
    const result = renderHook(
      makePost([{ reaction: '❤️', profile: { id: 'me-1' } }]),
    );

    expect(result.myReactions).toEqual(['❤️']);
    expect(result.canReact).toBe(true);

    await act(async () => {
      await result.toggleReaction('❤️');
    });

    expect(mocks.retractFn).toHaveBeenCalledWith(
      undefined,
      { reaction: '❤️' },
      undefined,
    );
    // Without the capability a *new* reaction is still refused.
    await act(async () => {
      await result.toggleReaction('🎉');
    });
    expect(mocks.reactFn).not.toHaveBeenCalled();
  });

  it('derives canReact from the real getPostActionAvailability (non-member of a group post)', async () => {
    // Exercises the real hook→capability plumbing (not the constant stub):
    // a group post with no membership returns canReact=false from
    // getPostActionAvailability regardless of any react capability.
    mocks.useRealAvailability = true;
    mocks.authData = { profile: { id: 'me-1', memberships: [] } };
    const post = makePost([], {
      groupId: 'group-1',
      group: { id: 'group-1' },
    } as never);
    const result = renderHook(post);

    // useFeedPostActions returns `canReact` = canReactRaw || iReacted
    // For a non-member, both are false -> canReact = false.
    expect(result.canReact).toBe(false);

    await act(async () => {
      await result.toggleReaction('❤️');
    });
    expect(mocks.reactFn).not.toHaveBeenCalled();
  });
});
