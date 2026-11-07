import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta, ProfileWithMeta } from '@openpeepshq/common/types';

vi.mock('@openpeepshq/core/notifications', () => ({
  maybeCreateNotification: vi.fn(),
}));
vi.mock('@openpeepshq/core/posts', () => ({
  getConversationByEnd: vi.fn(async () => [{}]),
}));
vi.mock('../../../config', () => ({
  communityConfig: vi.fn(async () => ({})),
}));

import directMessage from './index';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';

const profile = (id: string): ProfileWithMeta => ({ id }) as never;

const directPost = (over: Partial<PostWithMeta> = {}): PostWithMeta =>
  ({
    id: 'post-1',
    profile: profile('bob'),
    visibility: 'direct',
    data: { type: 'note', content: 'hello' },
    ...over,
  }) as never;

describe('directMessage handler', () => {
  beforeEach(() => {
    vi.mocked(maybeCreateNotification).mockReset().mockResolvedValue(undefined);
  });

  it('does not notify for a leave post (a reply that leaves out its author)', async () => {
    await directMessage.eventHandler(
      directPost({
        inReplyToId: 'prev-1',
        audience: [profile('alice')],
      }),
    );
    expect(maybeCreateNotification).not.toHaveBeenCalled();
  });

  it('still notifies for a root direct post whose author is outside the audience', async () => {
    await directMessage.eventHandler(
      directPost({
        audience: [profile('alice')],
      }),
    );
    expect(maybeCreateNotification).toHaveBeenCalledTimes(1);
    expect(maybeCreateNotification).toHaveBeenCalledWith(profile('alice'), {
      type: 'directMessage',
      fromProfileId: 'bob',
      postId: 'post-1',
    });
  });

  it('notifies the other participants for a reply the author takes part in', async () => {
    await directMessage.eventHandler(
      directPost({
        inReplyToId: 'prev-1',
        audience: [profile('bob'), profile('alice')],
      }),
    );
    expect(maybeCreateNotification).toHaveBeenCalledTimes(1);
    expect(maybeCreateNotification).toHaveBeenCalledWith(
      profile('alice'),
      expect.objectContaining({ type: 'directMessage' }),
    );
  });

  it('does not notify for non-direct or event posts', async () => {
    await directMessage.eventHandler(directPost({ visibility: 'public' }));
    await directMessage.eventHandler(
      directPost({ data: { type: 'event' } as never }),
    );
    expect(maybeCreateNotification).not.toHaveBeenCalled();
  });
});
