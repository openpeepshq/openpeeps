/** @vitest-environment jsdom */
/**
 * Regression test for reaction-toggle error swallowing (issue #276, round-5
 * review item #5): a failed attach/retract must not reject `toggleReaction`.
 * The call sites fire the promise as `void toggleReaction(…)`; a mid-session
 * change to the community's allowed set (the server replies
 * `error.reactionNotAllowed`, surfaced as a thrown object) or a concurrent
 * retract would otherwise leave an unhandled rejection. No local state changed
 * on a failed op, so swallowing is correct and the post self-heals on refetch.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';

const mocks = vi.hoisted(() => ({
  reactFn: vi.fn(async () => ({ success: true })),
  retractFn: vi.fn(async () => ({ success: true })),
  me: { id: 'me-1' },
  canReact: true,
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
  useAuthData: () => ({}),
  useCurrentProfile: () => mocks.me,
}));
vi.mock('../../components/server-data', () => ({
  useCapabilities: () => ({}),
}));
vi.mock('@openpeepshq/common', () => ({
  AP_LIKE_REACTION: '👍',
  getPostActionAvailability: () => ({
    canReply: true,
    canRepost: true,
    canReact: mocks.canReact,
  }),
}));

import { usePostReactionToggle } from './usePostReactionToggle';

const makePost = (
  reactions: Array<{ reaction: string; profile: { id: string } }>,
): PublicPost =>
  ({
    id: 'post-1',
    reactions,
  }) as unknown as PublicPost;

let hookResult: ReturnType<typeof usePostReactionToggle> | undefined;
const Probe = ({ post }: { post: PublicPost }) => {
  hookResult = usePostReactionToggle(post);
  return null;
};

describe('usePostReactionToggle error handling', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mocks.canReact = true;
    mocks.reactFn.mockClear().mockResolvedValue({ success: true });
    mocks.retractFn.mockClear().mockResolvedValue({ success: true });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
    hookResult = undefined;
  });

  const probe = (post: PublicPost) =>
    act(() => {
      root!.render(createElement(Probe, { post }));
    });

  it('does not reject when attaching is rejected', async () => {
    mocks.reactFn.mockRejectedValue({
      key: 'reactionNotAllowed',
      message: 'Reaction not allowed',
      status: 400,
    });
    probe(makePost([]));
    await expect(
      act(async () => {
        await hookResult!.toggleReaction('🎉');
      }),
    ).resolves.toBeUndefined();
    expect(mocks.reactFn).toHaveBeenCalledWith({ reaction: '🎉' });
  });

  it('does not reject when retracting is rejected', async () => {
    // The profile has 👍, so the no-argument toggle retracts it.
    mocks.retractFn.mockRejectedValue({
      key: 'notFound',
      message: 'no such reaction',
      status: 404,
    });
    probe(makePost([{ reaction: '👍', profile: { id: 'me-1' } }]));
    await expect(
      act(async () => {
        await hookResult!.toggleReaction();
      }),
    ).resolves.toBeUndefined();
    expect(mocks.retractFn).toHaveBeenCalledWith(undefined, {
      reaction: '👍',
    });
  });

  it('attaches the legacy like by default and the given emoji otherwise', async () => {
    probe(makePost([]));
    await act(async () => {
      await hookResult!.toggleReaction();
    });
    expect(mocks.reactFn).toHaveBeenLastCalledWith({ reaction: '👍' });
    await act(async () => {
      await hookResult!.toggleReaction('❤️');
    });
    expect(mocks.reactFn).toHaveBeenLastCalledWith({ reaction: '❤️' });
  });

  it('toggles each emoji independently: picking a new emoji does not retract an attached one', async () => {
    // Guards the cross-swap regression (issue #276, round-15 review item #3):
    // with 👍 attached, `toggleReaction('😂')` must attach 😂 and leave the 👍
    // alone. A retract of a *different* emoji here would be the cross-swap the
    // broken DELETE body-transport made live on the wire — the client would
    // drop the body and retract 👍 while "swapping" to 😂. Each emoji is an
    // independent toggle (see core `reactToPost`/`retractReaction` and the
    // integration "retract removes the picked reaction, not the like" spec),
    // so the profile's own reactions stack and are removed one at a time.
    probe(makePost([{ reaction: '👍', profile: { id: 'me-1' } }]));
    await act(async () => {
      await hookResult!.toggleReaction('😂');
    });
    expect(mocks.reactFn).toHaveBeenCalledWith({ reaction: '😂' });
    expect(mocks.retractFn).not.toHaveBeenCalled();
  });
});
