/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostActions } from './PostActions';
import { ReplyOpenerProvider } from '../../../hooks/posts/replyOpener';
import type { PublicPost } from '@openpeepshq/common/types';

// Web PostActions draft affordances (issue #382, round-13 review suggestion 1).
//
// The draft decision itself is pinned where it lives: the real
// `getPostActionAvailability` short-circuits to all-disabled for `isDraft`
// (platform/common/src/lib/__tests__/postHelpers.test.ts — "disables all
// actions for a draft, even for its author"), and core's `reactToPost` / `vote`
// reject a draft server-side (platform/core/src/posts/mutations.test.ts).
//
// This pin covers the web leaf: it drives the real `PostActions` →
// `useFeedPostActions` chain (mocking only the React data hooks, the react-ui
// Button, and the two presentational leaves) and asserts the component maps the
// availability flags the hook returns to `disabled` buttons — i.e. it renders
// the draft-restricted state the hook reports, and does not over-disable a
// published own post (a regression would show the Reply button disabled).
const state = vi.hoisted(() => ({
  canReply: false,
  canRepost: false,
  canReact: false,
  buttons: [] as Array<{
    title?: string;
    disabled?: boolean;
    'data-testid'?: string;
  }>,
}));

// The shared hook is the single decision surface for web + RN (both call
// `useFeedPostActions`, which wraps the real `getPostActionAvailability`).
// Pin the component against the flags it returns rather than re-deriving the
// full capability config here — that config is the common test's concern.
vi.mock('../../../hooks/posts/useFeedPostActions', () => ({
  useFeedPostActions: () => ({
    me: { id: 'me-1', displayName: 'Me', handle: 'me' },
    myRepost: undefined,
    iLiked: false,
    myReactions: [],
    canReply: state.canReply,
    canRepost: state.canRepost,
    canReact: state.canReact,
    reply: () => {},
    toggleRepost: () => {},
    toggleReaction: () => {},
  }),
}));

vi.mock('../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));
vi.mock('../../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'me-1', displayName: 'Me', handle: 'me' }),
  useAuthData: () => ({ profile: { id: 'me-1', memberships: [] }, scopes: [] }),
}));
vi.mock('../../server-data', () => ({
  useCapabilities: () => [],
}));
vi.mock('lucide-react', () => {
  const Icon = () => null;
  return { Reply: Icon, Repeat2: Icon, Share: Icon };
});
vi.mock('./ReactionPicker', () => ({ ReactionPicker: () => null }));
vi.mock('./ShareMenu', () => ({ ShareMenu: () => null }));
// Capture each Button the component renders so its `disabled` prop can be
// asserted (mirrors the RN PostActions/PostMenu button-capture pattern).
vi.mock('@openpeepshq/react-ui', async () => {
  const React = await import('react');
  return {
    Button: (props: {
      title?: string;
      disabled?: boolean;
      'data-testid'?: string;
      children?: React.ReactNode;
    }) => {
      state.buttons.push({
        title: props.title,
        disabled: props.disabled,
        'data-testid': props['data-testid'],
      });
      return React.createElement(
        'button',
        {
          title: props.title,
          disabled: props.disabled ?? false,
          'data-testid': props['data-testid'],
        },
        props.children,
      );
    },
    cn: (...parts: Array<string | false | null | undefined>) =>
      parts.filter(Boolean).join(' '),
  };
});

const basePost = {
  id: 'post-1',
  type: 'note',
  visibility: 'public',
  data: { type: 'note', content: 'hello' },
  profile: { id: 'me-1', displayName: 'Me', handle: 'me' },
  reactions: [],
  reposts: [],
  entries: [],
  rsvps: [],
  group: null,
  mentions: [],
  tags: [],
  replyCount: 0,
  repostCount: 0,
} as unknown as PublicPost;

describe('PostActions draft affordances (#382)', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.canReply = false;
    state.canRepost = false;
    state.canReact = false;
    state.buttons = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (post: PublicPost) =>
    act(() =>
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <ReplyOpenerProvider openReply={() => {}}>
            <PostActions post={post} />
          </ReplyOpenerProvider>
        </QueryClientProvider>,
      ),
    );

  const replyButton = () => state.buttons.find((b) => b.title === 'Reply');

  const repostButton = () =>
    state.buttons.find((b) => b['data-testid'] === 'posts-repost-button');

  it('renders Reply / Repost disabled when the hook reports a draft (all-disabled)', () => {
    // The real getPostActionAvailability returns all-false for a draft
    // (pinned in common), so useFeedPostActions reports all-disabled;
    // PostActions must render the buttons disabled, not the full self caps.
    render({ ...basePost, isDraft: true });

    const reply = replyButton();
    const repost = repostButton();
    expect(reply).toBeDefined();
    expect(repost).toBeDefined();
    expect(reply?.disabled).toBe(true);
    expect(repost?.disabled).toBe(true);
  });

  it('enables Reply for a published own post (no over-disabling)', () => {
    state.canReply = true;
    state.canRepost = false; // owner without repost create capability
    state.canReact = true;
    render({ ...basePost, isDraft: false });

    const reply = replyButton();
    const repost = repostButton();
    expect(reply).toBeDefined();
    expect(reply?.disabled).toBe(false);
    // Repost stays off (capability denied) — the draft guard must not be the
    // reason it is disabled here.
    expect(repost?.disabled).toBe(true);
  });
});
