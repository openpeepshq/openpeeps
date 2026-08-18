import { describe, expect, it } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  isUnreadFeedActivityForViewer,
  isUnreadPostForViewer,
} from '../postUnread';

const post = (
  overrides: Partial<PublicPost> & {
    id: string;
    seen: boolean;
    profileId: string;
  },
): PublicPost =>
  ({
    ...overrides,
    profile: { id: overrides.profileId },
  }) as unknown as PublicPost;

describe('unread feed activity', () => {
  const viewerId = 'viewer';

  it('treats a repost wrapper as unread even when the original was seen', () => {
    const original = post({
      id: 'original',
      seen: true,
      profileId: 'author',
    });
    const wrapper = post({
      id: 'wrapper',
      seen: false,
      profileId: 'deleted-reposter',
      repost: original,
    });

    expect(isUnreadPostForViewer(original, viewerId)).toBe(false);
    expect(isUnreadFeedActivityForViewer(wrapper, viewerId)).toBe(true);
  });

  it('does not treat the viewer’s own repost as unread', () => {
    const wrapper = post({
      id: 'wrapper',
      seen: false,
      profileId: viewerId,
      repost: post({ id: 'original', seen: false, profileId: 'author' }),
    });

    expect(isUnreadFeedActivityForViewer(wrapper, viewerId)).toBe(false);
  });
});
