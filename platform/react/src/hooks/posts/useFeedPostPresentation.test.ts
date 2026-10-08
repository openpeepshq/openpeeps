import { describe, expect, it } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { feedPostPresentation } from './useFeedPostPresentation';

const post = (overrides: Partial<PublicPost> & { id: string }): PublicPost =>
  ({
    profile: { id: 'author' },
    seen: true,
    repostCount: 0,
    replyCount: 0,
    reactions: [],
    ...overrides,
  }) as unknown as PublicPost;

describe('feedPostPresentation', () => {
  it('marks another profile’s unseen feed row as unread', () => {
    const view = feedPostPresentation(
      post({ id: 'p1', seen: false }),
      'viewer',
    );
    expect(view.isUnread).toBe(true);
    expect(view.viewContext.adjustUnread).toBe(true);
    expect(view.displayedPost.id).toBe('p1');
  });

  it('shows the original post when the feed row is a repost', () => {
    const original = post({ id: 'original' });
    const view = feedPostPresentation(
      post({
        id: 'wrapper',
        repost: original,
        profile: { id: 'reposter' } as PublicPost['profile'],
      }),
      'viewer',
    );
    expect(view.displayedPost.id).toBe('original');
    expect(view.hasReactionHeader).toBe(true);
  });

  it('previews a thread when the post has replies and is not itself a reply', () => {
    const view = feedPostPresentation(
      post({ id: 'p1', replyCount: 2 }),
      'viewer',
    );
    expect(view.showThreadPreview).toBe(true);
    expect(view.hasStats).toBe(true);
  });

  it('hides the thread preview when the card is already showing the parent', () => {
    const view = feedPostPresentation(
      post({
        id: 'p1',
        replyCount: 2,
        replyTo: post({ id: 'parent' }),
      }),
      'viewer',
      { showReplyTo: true },
    );
    expect(view.showsReplyTo).toBe(true);
    expect(view.showThreadPreview).toBe(false);
  });
});
