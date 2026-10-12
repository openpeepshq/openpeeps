import { describe, expect, it } from 'vitest';
import type { PostWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { newGroupPostRecipients } from './recipients';

const profile = (id: string): PublicProfile =>
  ({ id, displayName: id, handle: id }) as PublicProfile;

const members = [profile('author'), profile('parent'), profile('other')];

const groupPost = (overrides: Partial<PostWithMeta> = {}): PostWithMeta =>
  ({
    id: 'post-1',
    profile: profile('author'),
    data: { type: 'note', content: 'hello' },
    visibility: 'group',
    ...overrides,
  }) as PostWithMeta;

describe('newGroupPostRecipients', () => {
  it('notifies every member except the author', () => {
    const ids = newGroupPostRecipients(groupPost(), members).map((p) => p.id);
    expect(ids).toEqual(['parent', 'other']);
  });

  it('skips the parent author when they already get a reply notification', () => {
    const ids = newGroupPostRecipients(
      groupPost({
        inReplyToId: 'parent-post',
        replyTo: {
          id: 'parent-post',
          profile: profile('parent'),
          creatorId: 'parent',
        },
      } as Partial<PostWithMeta>),
      members,
    ).map((p) => p.id);

    expect(ids).toEqual(['other']);
  });

  it('still notifies the parent author for an event reply', () => {
    const ids = newGroupPostRecipients(
      groupPost({
        data: { type: 'event' },
        inReplyToId: 'parent-post',
        replyTo: {
          id: 'parent-post',
          profile: profile('parent'),
          creatorId: 'parent',
        },
      } as Partial<PostWithMeta>),
      members,
    ).map((p) => p.id);

    expect(ids).toEqual(['parent', 'other']);
  });

  it('still notifies the parent author for a direct reply', () => {
    const ids = newGroupPostRecipients(
      groupPost({
        visibility: 'direct',
        inReplyToId: 'parent-post',
        replyTo: {
          id: 'parent-post',
          profile: profile('parent'),
          creatorId: 'parent',
        },
      } as Partial<PostWithMeta>),
      members,
    ).map((p) => p.id);

    expect(ids).toEqual(['parent', 'other']);
  });
});
