import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  PostData,
  PostDataUnion,
  PostWithMeta,
  Profile,
} from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { config } from '../config';
import { hub } from '../events';
import * as blocks from '../profiles/blocks';
import * as activity from './activity';
import * as helpers from './helpers';
import { createPost } from './mutations';
import { postsMapping } from './mapping';

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn().mockResolvedValue({ db: {} }),
}));
vi.mock('../config', () => ({ config: vi.fn() }));

const PARENT_ID = '01970000-0000-7000-8000-000000000001';
const REPLY_ID = '01970000-0000-7000-8000-000000000002';

const profile = { id: 'creator-1' } as unknown as Profile;
const parent = {
  id: PARENT_ID,
  visibility: 'public',
} as unknown as PostWithMeta;
const reply = { id: REPLY_ID } as unknown as PostWithMeta;
const note = { type: 'note', content: 'hi' } as unknown as PostDataUnion;
const localNotePostData = () =>
  ({
    type: 'note',
    visibility: 'local',
    creatorId: 'creator-1',
  }) as unknown as PostData;

const mockConfig = vi.mocked(config);

const mockDependencies = () => {
  vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);
  mockConfig.mockResolvedValue({
    activityPub: { defaultDomain: 'localhost' },
  } as never);
  vi.spyOn(blocks, 'areBlocked').mockResolvedValue(false);
  vi.spyOn(blocks, 'hasBlockAmong').mockResolvedValue(false);
  vi.spyOn(helpers, 'extractHashtags').mockReturnValue([]);
  vi.spyOn(helpers, 'entryConnector').mockResolvedValue({} as never);
  vi.spyOn(helpers, 'replyConnector').mockResolvedValue({} as never);
  vi.spyOn(helpers, 'resolveMentionsForPost').mockResolvedValue([]);
  vi.spyOn(helpers, 'transformPost').mockResolvedValue(reply);
  vi.spyOn(activity, 'bumpConversationActivity').mockResolvedValue(undefined);
  vi.spyOn(hub, 'emit').mockResolvedValue(undefined);
  vi.spyOn(postsMapping, 'deleteRelations').mockResolvedValue(undefined);
  vi.spyOn(postsMapping, 'delete').mockResolvedValue(undefined);
};

describe('createPost reply validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a reply whose parent post no longer exists', async () => {
    mockDependencies();
    const find = vi.spyOn(postsMapping, 'find').mockResolvedValue(undefined);
    const removeDefaultFilter = vi.spyOn(postsMapping, 'removeDefaultFilter');

    await expect(
      createPost(note, profile, localNotePostData(), {
        inReplyToId: PARENT_ID,
      }),
    ).rejects.toMatchObject({
      code: 404,
      errorKey: 'error.postDeleted',
    });

    expect(find).toHaveBeenCalledWith({}, PARENT_ID);
    expect(removeDefaultFilter).not.toHaveBeenCalled();
  });

  it('rolls the reply back when the parent is deleted after the guard', async () => {
    mockDependencies();
    // First find (guard) sees the parent; the re-check before linking does not.
    vi.spyOn(postsMapping, 'find')
      .mockResolvedValueOnce(parent)
      .mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue(reply);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);
    const entryConnector = vi.spyOn(helpers, 'entryConnector');
    const replyConnector = vi.spyOn(helpers, 'replyConnector');
    const bumpConversationActivity = vi.spyOn(
      activity,
      'bumpConversationActivity',
    );

    await expect(
      createPost(note, profile, localNotePostData(), {
        inReplyToId: PARENT_ID,
      }),
    ).rejects.toMatchObject({
      code: 404,
      errorKey: 'error.postDeleted',
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(replyConnector).not.toHaveBeenCalled();
    expect(bumpConversationActivity).not.toHaveBeenCalled();
    expect(entryConnector).toHaveBeenLastCalledWith({}, profile, reply, {
      type: 'delete',
      data: { type: 'tombstone' },
    });
    expect(postsMapping.deleteRelations).toHaveBeenCalledWith(
      {},
      REPLY_ID,
      expect.objectContaining({ direction: 'INBOUND' }),
    );
    expect(postsMapping.delete).toHaveBeenCalledWith({}, REPLY_ID);
  });

  it('links the reply to the live parent and inherits its visibility', async () => {
    mockDependencies();
    vi.spyOn(postsMapping, 'find')
      .mockResolvedValueOnce(parent)
      .mockResolvedValueOnce(parent)
      .mockResolvedValue(reply);
    const create = vi.fn().mockResolvedValue(reply);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);
    const transformPost = vi.spyOn(helpers, 'transformPost');
    const replyConnector = vi.spyOn(helpers, 'replyConnector');

    const created = await createPost(note, profile, localNotePostData(), {
      inReplyToId: PARENT_ID,
    });

    expect(created).toBe(reply);
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        visibility: 'public',
        creatorId: 'creator-1',
      }),
    );
    expect(replyConnector).toHaveBeenCalledWith({}, reply, parent);
    expect(transformPost).toHaveBeenCalledWith(reply);
  });
});
