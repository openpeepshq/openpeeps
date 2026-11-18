import { describe, expect, it } from 'vitest';
import { AP_LIKE_REACTION } from '@openpeepshq/common/lib';
import {
  atUriFor,
  cidForRecord,
  feedPostReplyParent,
  feedPostText,
  isDesignatedLike,
  isProjectablePublicNote,
  likeToFeedLike,
  parseAtUri,
  postToFeedPost,
  rkeyFromPostId,
} from './records';

describe('atproto records', () => {
  it('only projects public notes', () => {
    expect(
      isProjectablePublicNote({ type: 'note', visibility: 'public' }),
    ).toBe(true);
    expect(isProjectablePublicNote({ type: 'note', visibility: 'local' })).toBe(
      false,
    );
    expect(
      isProjectablePublicNote({ type: 'article', visibility: 'public' }),
    ).toBe(false);
    expect(
      isProjectablePublicNote({
        type: 'note',
        visibility: 'public',
        deletedAt: '2026-01-01',
      }),
    ).toBe(false);
  });

  it('parses AT-URIs and maps note text', () => {
    const uri = atUriFor('did:web:ex', 'app.bsky.feed.post', '3abc');
    expect(parseAtUri(uri)).toEqual({
      did: 'did:web:ex',
      collection: 'app.bsky.feed.post',
      rkey: '3abc',
    });
    expect(parseAtUri('https://example/ap/objects/1')).toBeNull();
    expect(feedPostText({ text: 'hello' })).toBe('hello');
    expect(
      feedPostReplyParent({
        reply: { parent: { uri: 'at://did:web:ex/app.bsky.feed.post/1' } },
      }),
    ).toBe('at://did:web:ex/app.bsky.feed.post/1');
  });

  it('maps a public note and keeps rkeys stable per post id', async () => {
    const record = postToFeedPost(
      {
        data: { content: 'hello' },
      } as never,
      '2026-01-01T00:00:00.000Z',
    );
    expect(record.$type).toBe('app.bsky.feed.post');
    expect(record.text).toBe('hello');
    expect(rkeyFromPostId('post-1')).toBe(rkeyFromPostId('post-1'));
    expect(rkeyFromPostId('post-1')).not.toBe(rkeyFromPostId('post-2'));
    const cid = await cidForRecord(record);
    expect(cid).toMatch(/^bafy/);
    expect(await cidForRecord(record)).toBe(cid);
    expect(isDesignatedLike(AP_LIKE_REACTION)).toBe(true);
    expect(isDesignatedLike('🔥')).toBe(false);
  });

  it('emits StrongRef reply and like subjects', () => {
    const ref = { uri: 'at://did:web:ex/app.bsky.feed.post/1', cid: 'bafyabc' };
    const record = postToFeedPost(
      { data: { content: 'reply' } } as never,
      '2026-01-01T00:00:00.000Z',
      { root: ref, parent: ref },
    );
    expect(record.reply).toEqual({ root: ref, parent: ref });
    expect(likeToFeedLike(ref, '2026-01-01T00:00:00.000Z').subject).toEqual(
      ref,
    );
  });
});
