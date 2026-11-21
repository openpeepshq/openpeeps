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
import * as eventOccurrences from './eventOccurrences';
import * as pollEndJobs from './pollEndJobs';
import { createPost, publishPost, updatePost } from './mutations';
import { postsMapping } from './mapping';

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn().mockResolvedValue({ db: {} }),
}));
vi.mock('../config', () => ({ config: vi.fn() }));
vi.mock('./eventOccurrences', () => ({
  rebuildEventOccurrences: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./pollEndJobs', () => ({
  schedulePollEnd: vi.fn().mockResolvedValue(undefined),
  cancelPollEnd: vi.fn().mockResolvedValue(undefined),
}));

const PARENT_ID = '01970000-0000-7000-8000-000000000001';
const REPLY_ID = '01970000-0000-7000-8000-000000000002';

const profile = { id: 'creator-1' } as unknown as Profile;
const parent = {
  id: PARENT_ID,
  visibility: 'public',
  publishedAt: '2026-01-01T00:00:00.000Z',
} as unknown as PostWithMeta;
const draftParent = {
  id: PARENT_ID,
  visibility: 'public',
  publishedAt: null,
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

describe('draft posts', () => {
  // `eventOccurrences` and `pollEndJobs` are vi.mock'd above, so their
  // exports are module-level vi.fn(). `hub.emit` is spied per-test in
  // `mockDependencies`, so it must be (re)referenced after that runs.
  const sideEffects = () => ({
    emit: vi.mocked(hub.emit),
    rebuild: vi.mocked(eventOccurrences.rebuildEventOccurrences),
    schedule: vi.mocked(pollEndJobs.schedulePollEnd),
    cancel: vi.mocked(pollEndJobs.cancelPollEnd),
  });

  const clearSideEffects = () => {
    const { emit, rebuild, schedule, cancel } = sideEffects();
    emit.mockClear();
    rebuild.mockClear();
    schedule.mockClear();
    cancel.mockClear();
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects drafts that would be nested on a reply or repost, or direct', async () => {
    mockDependencies();
    clearSideEffects();
    const draftRelations: Array<Record<string, unknown>> = [
      { inReplyToId: PARENT_ID },
      { repostId: PARENT_ID },
    ];

    for (const relations of draftRelations) {
      await expect(
        createPost(note, profile, localNotePostData(), {
          draft: true,
          ...relations,
        } as never),
      ).rejects.toMatchObject({
        code: 422,
        errorKey: relations.inReplyToId
          ? 'error.draftNotReply'
          : 'error.draftNotRepost',
      });
    }
    // Nothing was published while these were rejected.
    expect(sideEffects().emit).not.toHaveBeenCalled();

    await expect(
      createPost(
        note,
        profile,
        {
          type: 'note',
          visibility: 'direct',
          creatorId: 'creator-1',
        } as unknown as PostData,
        { draft: true },
      ),
    ).rejects.toMatchObject({
      code: 422,
      errorKey: 'error.draftNotDirect',
    });
  });

  it('creates a draft with publishedAt null and fires no publish-time side effects', async () => {
    mockDependencies();
    clearSideEffects();
    vi.spyOn(postsMapping, 'find').mockResolvedValue(reply);
    const create = vi.fn().mockResolvedValue(reply);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);
    const transformPost = vi.spyOn(helpers, 'transformPost');

    const created = await createPost(note, profile, localNotePostData(), {
      draft: true,
    });

    const { emit, rebuild, schedule } = sideEffects();
    expect(created).toBe(reply);
    // The row is persisted without a publish timestamp.
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        publishedAt: null,
        creatorId: 'creator-1',
      }),
    );
    // No postCreated event, no occurrences, no poll-end scheduling.
    expect(emit).not.toHaveBeenCalled();
    expect(rebuild).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
    expect(transformPost).toHaveBeenCalledWith(reply);
  });

  // A draft parent must not be replyable/repostable: the by-id finder skips
  // the `publishedAt` default filter, so an unpublished target would otherwise
  // leak into a published reply/repost.
  it('rejects a reply whose parent is an unpublished draft', async () => {
    mockDependencies();
    const find = vi.spyOn(postsMapping, 'find').mockResolvedValue(draftParent);
    const create = vi.fn();
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);

    await expect(
      createPost(note, profile, localNotePostData(), {
        inReplyToId: PARENT_ID,
      }),
    ).rejects.toMatchObject({
      code: 422,
      errorKey: 'error.postNotPublished',
    });

    // Rejected before anything is persisted or emitted.
    expect(create).not.toHaveBeenCalled();
    expect(sideEffects().emit).not.toHaveBeenCalled();
    expect(find).toHaveBeenCalledWith({}, PARENT_ID);
  });

  it('rejects a repost of an unpublished draft', async () => {
    mockDependencies();
    const find = vi.spyOn(postsMapping, 'find').mockResolvedValue(draftParent);
    const create = vi.fn();
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);

    await expect(
      createPost(note, profile, localNotePostData(), {
        repostId: PARENT_ID,
      }),
    ).rejects.toMatchObject({
      code: 422,
      errorKey: 'error.postNotPublished',
    });

    expect(find).toHaveBeenCalledWith({}, PARENT_ID);
    expect(create).not.toHaveBeenCalled();
    expect(sideEffects().emit).not.toHaveBeenCalled();
  });

  it('allows a reply to a published parent', async () => {
    mockDependencies();
    vi.spyOn(postsMapping, 'find')
      .mockResolvedValueOnce(parent)
      .mockResolvedValueOnce(parent)
      .mockResolvedValue(reply);
    const create = vi.fn().mockResolvedValue(reply);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);

    const created = await createPost(note, profile, localNotePostData(), {
      inReplyToId: PARENT_ID,
    });

    expect(created).toBe(reply);
    expect(create).toHaveBeenCalledOnce();
  });

  it('publishPost sets publishedAt and emits postCreated exactly once', async () => {
    mockDependencies();
    clearSideEffects();
    const draft = {
      id: REPLY_ID,
      creatorId: 'creator-1',
      publishedAt: null,
      data: { type: 'event' },
    } as unknown as PostWithMeta;
    // The re-read after the update returns the same body, now published.
    const published = {
      id: REPLY_ID,
      creatorId: 'creator-1',
      publishedAt: '2026-01-01T00:00:00.000Z',
      data: { type: 'event' },
    } as unknown as PostWithMeta;
    vi.spyOn(postsMapping, 'find').mockResolvedValue(published);
    const update = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      update,
    } as never);
    vi.spyOn(helpers, 'transformPost').mockResolvedValue(published);

    const result = await publishPost(draft, profile);

    const { emit, rebuild, schedule } = sideEffects();
    expect(result).toBe(published);
    expect(update).toHaveBeenCalledWith(
      {},
      REPLY_ID,
      expect.objectContaining({
        publishedAt: expect.any(String),
      }),
    );
    // postCreated exactly once (and nothing else was emitted).
    const postCreatedCalls = emit.mock.calls.filter(
      (call) => call[0] === 'postCreated',
    );
    expect(postCreatedCalls).toHaveLength(1);
    expect(emit).toHaveBeenCalledTimes(1);
    // The shared side-effect block ran for the event body.
    expect(rebuild).toHaveBeenCalledWith(REPLY_ID, { type: 'event' });
    expect(schedule).not.toHaveBeenCalled();
  });

  it('publishPost rejects non-drafts and non-owners', async () => {
    mockDependencies();
    clearSideEffects();
    const published = {
      id: REPLY_ID,
      creatorId: 'creator-1',
      publishedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as PostWithMeta;
    const someoneElse = { id: 'other-1' } as unknown as Profile;

    await expect(publishPost(published, profile)).rejects.toMatchObject({
      code: 422,
      errorKey: 'error.alreadyPublished',
    });

    const draft = { ...published, publishedAt: null } as PostWithMeta;
    await expect(publishPost(draft, someoneElse)).rejects.toMatchObject({
      code: 403,
      errorKey: 'error.notDraftOwner',
    });
    // No side effects from a failed publish.
    const { emit, rebuild } = sideEffects();
    expect(emit).not.toHaveBeenCalled();
    expect(rebuild).not.toHaveBeenCalled();
  });

  it('updatePost skips publish-time side effects while the post is a draft', async () => {
    mockDependencies();
    clearSideEffects();
    const draft = {
      id: REPLY_ID,
      creatorId: 'creator-1',
      isDraft: true,
      data: { type: 'event' },
      tags: [],
    } as unknown as PostWithMeta;
    vi.spyOn(helpers, 'transformPost').mockResolvedValue(draft);
    vi.spyOn(postsMapping, 'update').mockResolvedValue(undefined);
    vi.spyOn(postsMapping, 'find').mockResolvedValue(draft);
    const eventData = {
      type: 'event',
      name: 'changed',
    } as unknown as PostDataUnion;

    const updated = await updatePost(draft, profile, eventData);

    const { emit, rebuild, schedule, cancel } = sideEffects();
    expect(updated).toBe(draft);
    // The row is still edited, but no occurrences, poll-end jobs, or emit.
    expect(postsMapping.update).toHaveBeenCalledWith(
      {},
      REPLY_ID,
      expect.objectContaining({ data: expect.anything() }),
    );
    expect(rebuild).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
