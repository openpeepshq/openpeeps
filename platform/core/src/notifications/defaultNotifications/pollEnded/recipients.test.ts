import { describe, expect, it } from 'vitest';
import type { PostWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { pollEndedRecipientProfiles } from './recipients';

const profile = (id: string): PublicProfile =>
  ({ id, displayName: id, handle: id }) as PublicProfile;

const pollPost = (overrides: Partial<PostWithMeta> = {}): PostWithMeta =>
  ({
    id: 'poll-1',
    type: 'question',
    data: {
      type: 'question',
      options: [
        { type: 'note', content: 'Yes' },
        { type: 'note', content: 'No' },
      ],
    },
    profile: profile('creator'),
    entries: [],
    ...overrides,
  }) as PostWithMeta;

describe('pollEndedRecipientProfiles', () => {
  it('includes the poll creator', () => {
    const ids = pollEndedRecipientProfiles(pollPost()).map((p) => p.id);
    expect(ids).toEqual(['creator']);
  });

  it('includes voters and dedupes the creator', () => {
    const ids = pollEndedRecipientProfiles(
      pollPost({
        entries: [
          {
            type: 'answer',
            profile: profile('creator'),
            data: { selection: [0] },
            createdAt: '2026-09-21T11:00:00.000Z',
          },
          {
            type: 'answer',
            profile: profile('voter'),
            data: { selection: [1] },
            createdAt: '2026-09-21T11:01:00.000Z',
          },
          {
            type: 'answer',
            profile: profile('undone'),
            data: { selection: [] },
            createdAt: '2026-09-21T11:02:00.000Z',
          },
        ],
      } as Partial<PostWithMeta>),
    ).map((p) => p.id);

    expect(ids.sort()).toEqual(['creator', 'voter']);
  });

  it('includes the parent post creator when the poll is a reply', () => {
    const ids = pollEndedRecipientProfiles(
      pollPost({
        inReplyToId: 'parent-1',
        replyTo: { id: 'parent-1', profile: profile('parent-author') },
      } as Partial<PostWithMeta>),
    ).map((p) => p.id);

    expect(ids.sort()).toEqual(['creator', 'parent-author']);
  });
});
