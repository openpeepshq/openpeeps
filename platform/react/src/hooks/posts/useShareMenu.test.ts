/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { postPublicPath, useShareMenu } from './useShareMenu';

describe('postPublicPath', () => {
  it('builds the post path', () => {
    expect(postPublicPath({ id: 'abc' })).toBe('/posts/abc');
  });

  it('keeps a recurring event occurrence in the query', () => {
    expect(
      postPublicPath({
        id: 'evt',
        occurrenceRecurrenceId: '2026-10-23T13:00:00.000Z',
      }),
    ).toBe('/posts/evt?occurrence=2026-10-23T13%3A00%3A00.000Z');
  });
});

const mockRepostPost = vi.fn();
/** the mutation fn a `createConversationPostAction({ id })` returns */
const mockCreateConversationPostFn = vi.fn();
let mockProfile: { id: string } | null = { id: 'me' };

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      repostPostAction: () => mockRepostPost,
      // createConversationPostAction is a query-mutation: it returns the fn
      // that submits the conversation post.
      createConversationPostAction: () => mockCreateConversationPostFn,
    },
  }),
}));

vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () => mockProfile,
}));

const makePost = (overrides: Partial<PublicPost> = {}): PublicPost =>
  ({
    id: 'post-1',
    type: 'note',
    visibility: 'public',
    profile: { id: 'author' },
    data: { type: 'note', content: 'Hello world' },
    ...overrides,
  }) as unknown as PublicPost;

// A single root reused across tests: React 19 + jsdom mis-flushes when a
// fresh createRoot is made per test after an async act has run.
let root: Root;
let container: HTMLDivElement;
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

/** Render the hook for `post`/`postUrl` and return its result. */
function renderHook(
  post: PublicPost,
  postUrl: string,
): ReturnType<typeof useShareMenu> {
  let captured: ReturnType<typeof useShareMenu> | undefined;
  const Host = () => {
    captured = useShareMenu(post, postUrl);
    return null;
  };
  act(() => {
    root.render(createElement(Host));
  });
  return captured!;
}

describe('useShareMenu', () => {
  afterEach(() => {
    mockRepostPost.mockReset();
    mockCreateConversationPostFn.mockReset();
    mockProfile = { id: 'me' };
    act(() => {
      root.render(null);
    });
  });

  it('reports the signed-in state from the current profile', () => {
    expect(renderHook(makePost(), 'https://x/posts/post-1').signedIn).toBe(
      true,
    );
    mockProfile = null;
    expect(renderHook(makePost(), 'https://x/posts/post-1').signedIn).toBe(
      false,
    );
  });

  it('reposts to the public feed without a group by default', () => {
    const share = renderHook(makePost(), 'https://x/posts/post-1');
    share.repost();
    expect(mockRepostPost).toHaveBeenCalledWith({ groupId: undefined });
  });

  it('shareIntoGroup reposts into the given group', async () => {
    const share = renderHook(makePost(), 'https://x/posts/post-1');
    await share.shareIntoGroup('group-1');
    expect(mockRepostPost).toHaveBeenCalledWith({ groupId: 'group-1' });
  });

  it('sends a public post into a conversation with the link plus an excerpt', async () => {
    const share = renderHook(makePost(), 'https://x/posts/post-1');
    const conversation = [
      { id: 'root-1' },
      { id: 'reply-1' },
    ] as unknown as PublicPost[];
    await share.sendToConversation(conversation);
    expect(mockCreateConversationPostFn).toHaveBeenCalledWith({
      visibility: 'direct',
      type: 'note',
      data: {
        type: 'note',
        content: 'https://x/posts/post-1\nHello world',
      },
    });
  });

  it('sends a private post into a conversation as a link only (no excerpt)', async () => {
    const share = renderHook(
      makePost({ visibility: 'group' as PublicPost['visibility'] }),
      'https://x/posts/post-1',
    );
    const conversation = [{ id: 'root-1' }] as unknown as PublicPost[];
    await share.sendToConversation(conversation);
    expect(mockCreateConversationPostFn).toHaveBeenCalledWith({
      visibility: 'direct',
      type: 'note',
      data: { type: 'note', content: 'https://x/posts/post-1' },
    });
  });

  it('does nothing when sendToConversation receives an empty conversation', async () => {
    const share = renderHook(makePost(), 'https://x/posts/post-1');
    await share.sendToConversation([]);
    expect(mockCreateConversationPostFn).not.toHaveBeenCalled();
  });
});
