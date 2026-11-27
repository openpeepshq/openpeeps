import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultRoles } from '@openpeepshq/common';
import type {
  PostData,
  PostDataUnion,
  PostWithMeta,
  Profile,
  Role,
} from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { config } from '../config';
import { hub } from '../events';
import * as blocks from '../profiles/blocks';
import * as activity from './activity';
import * as helpers from './helpers';
import * as eventOccurrences from './eventOccurrences';
import * as pollEndJobs from './pollEndJobs';
import {
  createPost,
  publishPost,
  reactToPost,
  updatePost,
  vote,
} from './mutations';
import { postsMapping } from './mapping';

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn().mockResolvedValue({ db: {} }),
}));
vi.mock('../config', () => ({ config: vi.fn() }));
vi.mock('../groups/finders', () => ({
  findGroup: vi.fn(async (id: string) =>
    id === 'group-1' ? { id, handle: 'grp' } : undefined,
  ),
}));
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

// The broadcast-flag tests drive the real default-role surface: `member`
// carries the wildcard `core-posts-create-*` (save path reachable, no
// announce) and `moderator` carries `core-posts-announce`, the capability the
// announce endpoint requires for the community-wide jam broadcast flag.
const roleFor = (key: string): Role =>
  defaultRoles.find((role) => role.key === key) as Role;
const makeProfile = (key: string): Profile & { roles: Role[] } => ({
  id: 'creator-1',
  handle: '@creator-1@localhost',
  type: 'local',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  roles: [roleFor(key)],
});
const memberProfile = makeProfile('member');
const moderatorProfile = makeProfile('moderator');

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

describe('createPost community-wide jam broadcast flag', () => {
  const jamData = (
    jam: Record<string, unknown>,
    over: Record<string, unknown> = {},
  ) =>
    ({
      type: 'event',
      name: 'Standup',
      start: '2026-01-01T09:00:00.000Z',
      ...over,
      jam,
    }) as unknown as PostDataUnion;

  const eventPostData = (visibility: string) =>
    ({
      type: 'event',
      visibility,
      creatorId: 'creator-1',
    }) as unknown as PostData;

  const runCreate = async (
    data: PostDataUnion,
    relations: object = {},
    nominalVisibility: string = 'public',
    creator: Profile = moderatorProfile,
  ) => {
    const create = vi.fn().mockResolvedValue(reply);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);
    vi.spyOn(helpers, 'groupConnector').mockResolvedValue({} as never);
    vi.spyOn(eventOccurrences, 'rebuildEventOccurrences').mockResolvedValue(
      undefined,
    );
    await createPost(
      data,
      creator,
      eventPostData(nominalVisibility),
      relations as never,
    );
    return { create };
  };

  it('drops the broadcast flag when the post lands in a group (group override)', async () => {
    mockDependencies();
    vi.spyOn(postsMapping, 'find').mockResolvedValue(undefined);
    const { create } = await runCreate(
      jamData({ notifyEveryone: true, waitingRoom: true }),
      { groupId: 'group-1' },
    );
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        visibility: 'group',
        data: expect.objectContaining({
          jam: expect.not.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });

  it('keys the strip on the final visibility, not the nominal groupId', async () => {
    // A public-visibility payload that carries a group id which does not
    // resolve to a group (stale/denied). The post therefore lands public, so
    // the creator's opt-in must survive. The strip must key off the post's own
    // final visibility (what the jam-start handler and updatePost read), not
    // `relations.groupId != null ? 'group' : ...`, which would wrongly drop it.
    mockDependencies();
    vi.spyOn(postsMapping, 'find').mockResolvedValue(undefined);
    const { create } = await runCreate(
      jamData({ notifyEveryone: true, waitingRoom: true }),
      { groupId: 'orphan-group' },
    );
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        visibility: 'public',
        data: expect.objectContaining({
          jam: expect.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });

  it('keeps the broadcast flag on a community-wide event without a group', async () => {
    mockDependencies();
    vi.spyOn(postsMapping, 'find').mockResolvedValue(undefined);
    const { create } = await runCreate(
      jamData({ notifyEveryone: true, waitingRoom: true }),
      {},
    );
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        visibility: 'public',
        data: expect.objectContaining({
          jam: expect.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });

  it('keeps the broadcast flag on a local community-wide event', async () => {
    // `local` is the second community-wide visibility: it shares the
    // `['local', 'public']` branch with `public`, so its opt-in survives the
    // strip just like the public keep-case above.
    mockDependencies();
    vi.spyOn(postsMapping, 'find').mockResolvedValue(undefined);
    const { create } = await runCreate(
      jamData({ notifyEveryone: true, waitingRoom: true }),
      {},
      'local',
    );
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        visibility: 'local',
        data: expect.objectContaining({
          jam: expect.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });

  it('drops the broadcast flag for a creator without the announce capability', async () => {
    // The default member role wildcard-matches `core-posts-create-*`, so the
    // save path is reachable for a plain member; only the UI hides the
    // toggle. A crafted public-visibility payload must not keep the flag —
    // the broadcast requires `core-posts-announce` (the announce endpoint's
    // rule), enforced server-side in the shared mutations layer.
    mockDependencies();
    vi.spyOn(postsMapping, 'find').mockResolvedValue(undefined);
    const { create } = await runCreate(
      jamData({ notifyEveryone: true, waitingRoom: true }),
      {},
      'public',
      memberProfile,
    );
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        visibility: 'public',
        data: expect.objectContaining({
          jam: expect.not.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });
});

describe('updatePost community-wide jam broadcast flag', () => {
  const jamData = (
    jam: Record<string, unknown>,
    over: Record<string, unknown> = {},
  ) =>
    ({
      type: 'event',
      name: 'Standup',
      start: '2026-01-01T09:00:00.000Z',
      ...over,
      jam,
    }) as unknown as PostDataUnion;

  const runUpdate = async (
    visibility: string,
    data: PostDataUnion,
    creator: Profile = moderatorProfile,
  ) => {
    mockDependencies();
    vi.spyOn(eventOccurrences, 'rebuildEventOccurrences').mockResolvedValue(
      undefined,
    );
    vi.spyOn(pollEndJobs, 'cancelPollEnd').mockResolvedValue(undefined);
    vi.spyOn(pollEndJobs, 'schedulePollEnd').mockResolvedValue(undefined);
    const update = vi
      .spyOn(postsMapping, 'update')
      .mockResolvedValue(undefined);
    vi.spyOn(postsMapping, 'find').mockResolvedValue(reply);
    await updatePost(
      {
        id: REPLY_ID,
        visibility,
        tags: [],
        data: undefined,
      } as unknown as PostWithMeta,
      creator,
      data,
    );
    return { update };
  };

  it('drops the broadcast flag when the post is group-scoped', async () => {
    const { update } = await runUpdate(
      'group',
      jamData({ notifyEveryone: true, waitingRoom: true }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      REPLY_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.not.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });

  it('keeps the broadcast flag when the post is community-wide (public)', async () => {
    const { update } = await runUpdate(
      'public',
      jamData({ notifyEveryone: true, waitingRoom: true }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      REPLY_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });

  it('keeps the broadcast flag when the post is community-wide (local)', async () => {
    // `local` is the second community-wide visibility, so its opt-in survives
    // the update strip just like the public keep-case above.
    const { update } = await runUpdate(
      'local',
      jamData({ notifyEveryone: true, waitingRoom: true }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      REPLY_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
  });

  it('drops the broadcast flag for a creator without the announce capability', async () => {
    // The PUT path consults no capability for public posts with a jam (the
    // pre-existing guest-access exemption), so the shared-mutations-layer
    // strip is the only server-side check of `core-posts-announce` there.
    const { update } = await runUpdate(
      'public',
      jamData({ notifyEveryone: true, waitingRoom: true }),
      memberProfile,
    );
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      REPLY_ID,
      expect.objectContaining({
        data: expect.objectContaining({
          jam: expect.not.objectContaining({ notifyEveryone: true }),
        }),
      }),
    );
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

  // The deferral contract, pinned per body type: a `draft: true` create must
  // not create occurrences or schedule poll-end for anything that
  // `publishPost`'s `announcePostCreation` will fire exactly once later.
  it('a draft event creates no occurrences (they are rebuilt at publish time)', async () => {
    mockDependencies();
    clearSideEffects();
    const draft = {
      id: REPLY_ID,
      creatorId: 'creator-1',
      publishedAt: null,
      data: { type: 'event' },
    } as unknown as PostWithMeta;
    const eventData = {
      type: 'event',
      name: 'Meetup',
      visibility: 'local',
      creatorId: 'creator-1',
    } as unknown as PostDataUnion;
    vi.spyOn(postsMapping, 'find').mockResolvedValue(draft);
    const create = vi.fn().mockResolvedValue(draft);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);
    vi.spyOn(helpers, 'transformPost').mockResolvedValue(draft);

    const created = await createPost(eventData, profile, eventData, {
      draft: true,
    });

    const { emit, rebuild, schedule } = sideEffects();
    expect(created).toBe(draft);
    expect(create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ publishedAt: null }),
    );
    // Occurrences are deferred to `publishPost`, not created on draft save.
    expect(rebuild).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('a draft question schedules no poll-end (scheduled once at publish time)', async () => {
    mockDependencies();
    clearSideEffects();
    const draft = {
      id: REPLY_ID,
      creatorId: 'creator-1',
      publishedAt: null,
      data: { type: 'question' },
    } as unknown as PostWithMeta;
    const questionData = {
      type: 'question',
      content: 'Poll?',
      options: [{ id: 'opt-1', text: 'A' }],
      visibility: 'local',
      creatorId: 'creator-1',
    } as unknown as PostDataUnion;
    vi.spyOn(postsMapping, 'find').mockResolvedValue(draft);
    const create = vi.fn().mockResolvedValue(draft);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      create,
    } as never);
    vi.spyOn(helpers, 'transformPost').mockResolvedValue(draft);

    const created = await createPost(questionData, profile, questionData, {
      draft: true,
    });

    const { emit, rebuild, schedule } = sideEffects();
    expect(created).toBe(draft);
    expect(rebuild).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    // The poll-end job is the whole deferral bet for questions: nothing
    // before publish, exactly once after.
    expect(schedule).not.toHaveBeenCalled();

    const published = {
      ...draft,
      publishedAt: '2026-01-02T00:00:00.000Z',
      data: { type: 'question', expiresAt: '2026-01-03T00:00:00.000Z' },
    };
    vi.spyOn(postsMapping, 'find').mockResolvedValue(published);
    vi.spyOn(postsMapping, 'removeDefaultFilter').mockReturnValue({
      update: vi.fn().mockResolvedValue(undefined),
    } as never);
    vi.spyOn(helpers, 'transformPost').mockResolvedValue(published);
    await publishPost(draft, profile);

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(REPLY_ID, '2026-01-03T00:00:00.000Z');
    const postCreatedCalls = emit.mock.calls.filter(
      (call) => call[0] === 'postCreated',
    );
    expect(postCreatedCalls).toHaveLength(1);
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

describe('reactToPost idempotency (one reaction per emoji per profile)', () => {
  const mockDb = () => {
    vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makePost = (
    reactions: Array<{ reaction: string; profile: { id: string } }>,
  ) =>
    ({
      id: REPLY_ID,
      reactions,
    }) as unknown as PostWithMeta;

  it('writes the reaction and emits when the profile has not attached that emoji', async () => {
    mockDb();
    const entryConnector = vi
      .spyOn(helpers, 'entryConnector')
      .mockResolvedValue({} as never);
    const emit = vi.spyOn(hub, 'emit').mockResolvedValue(undefined);

    const post = makePost([]);

    await reactToPost(post, profile, { reaction: '🎉' });

    expect(entryConnector).toHaveBeenCalledWith({}, profile, post, {
      type: 'reaction',
      data: { reaction: '🎉' },
    });
    expect(emit).toHaveBeenCalledWith('reactionCreated', profile, post, {
      type: 'reaction',
      reaction: '🎉',
    });
  });

  it('is a no-op when the profile already attached that emoji (no write, no duplicate notification)', async () => {
    const post = makePost([{ reaction: '🎉', profile: { id: 'creator-1' } }]);
    const entryConnector = vi.spyOn(helpers, 'entryConnector');
    const emit = vi.spyOn(hub, 'emit');

    await reactToPost(post, profile, { reaction: '🎉' });

    expect(entryConnector).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('still writes a different emoji the profile has not used', async () => {
    mockDb();
    const post = makePost([{ reaction: '🎉', profile: { id: 'creator-1' } }]);
    const entryConnector = vi
      .spyOn(helpers, 'entryConnector')
      .mockResolvedValue({} as never);
    vi.spyOn(hub, 'emit').mockResolvedValue(undefined);

    await reactToPost(post, profile, { reaction: '❤️' });

    expect(entryConnector).toHaveBeenCalledWith({}, profile, post, {
      type: 'reaction',
      data: { reaction: '❤️' },
    });
  });

  it('rejects a reaction on a draft (no entry write, no emit)', async () => {
    const entryConnector = vi.spyOn(helpers, 'entryConnector');
    const emit = vi.spyOn(hub, 'emit');
    const draft = makePost([]);
    draft.isDraft = true;

    await expect(
      reactToPost(draft, profile, { reaction: '🎉' }),
    ).rejects.toMatchObject({
      code: 422,
      errorKey: 'error.postNotPublished',
    });
    expect(entryConnector).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('vote draft guard', () => {
  const entryConnector = vi.spyOn(helpers, 'entryConnector');
  const emit = vi.spyOn(hub, 'emit');

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a poll vote on a draft (no entry write, no emit)', async () => {
    const draft = {
      id: REPLY_ID,
      creatorId: 'creator-1',
      isDraft: true,
      data: {
        type: 'question',
        options: ['a', 'b'],
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    } as unknown as PostWithMeta;

    await expect(
      vote(profile, draft, { selection: [0] }),
    ).rejects.toMatchObject({
      code: 422,
      errorKey: 'error.postNotPublished',
    });
    expect(entryConnector).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
