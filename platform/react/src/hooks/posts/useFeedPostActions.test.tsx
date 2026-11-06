/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { useFeedPostActions } from './useFeedPostActions';

const mocks = vi.hoisted(() => ({
  reactFn: vi.fn(async () => ({ success: true })),
  retractFn: vi.fn(async () => ({ success: true })),
  me: { id: 'me-1' },
  canReact: true,
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
  useAuthData: () => ({}),
  useCurrentProfile: () => mocks.me,
}));

vi.mock('../../components/server-data', () => ({
  useCapabilities: () => ({}),
}));

vi.mock('@openpeepshq/common', () => ({
  getPostActionAvailability: () => ({
    canReply: true,
    canRepost: true,
    canReact: mocks.canReact,
  }),
}));

vi.mock('./replyOpener', () => ({
  useReplyOpener: () => vi.fn(),
}));

const makePost = (
  reactions: Array<{ reaction: string; profile: { id: string } }>,
): PublicPost =>
  ({
    id: 'post-1',
    reactions,
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
    act(() => {
      newRoot.render(createElement(Probe, { post }));
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

    expect(mocks.retractFn).toHaveBeenCalledWith({ reaction: '❤️' });
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

    expect(mocks.retractFn).toHaveBeenCalledWith({ reaction: '👍' });
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
});
