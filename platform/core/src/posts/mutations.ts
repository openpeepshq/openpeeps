import {
  AuthorizationData,
  Answer,
  Hashtag,
  PostWithMeta,
  PostData,
  Profile,
  ProfileWithMeta,
  ReactionData,
  RSVP,
  RsvpRequest,
  RsvpResponse,
} from '@openpeepshq/common/types';

import { PostDataUnion } from '@openpeepshq/common/types';
import { sql } from 'drizzle-orm';
import { allpeepDb } from '../db';
import { uuidv7 } from 'uuidv7';
import { nowIso } from '../db/pg/mappers';
import { postSeen } from '../db/pg/schema/edges';
import {
  audienceConnector,
  bookmarkConnector,
  bookmarkDisconnector,
  entryConnector,
  extractHashtags,
  groupConnector,
  hashtagConnector,
  hashtagDisconnector,
  mentionConnector,
  replyConnector,
  repostConnector,
  resolveMentionsForPost,
  transformPost,
} from './helpers';
import { postsMapping, repostRelation } from './mapping';
import { bumpConversationActivity } from './activity';
import { findGroup } from '../groups/finders';
import {
  findLatestThreadPostId,
  listOneToOneConversationRootLeaves,
} from './conversationQueries';
import { findPost, findPostsForAuth } from './finders';
import { profilesCache } from '../profiles/cache';
import { findOrCreateHashtag } from '../hashtags';
import { hub } from '../events';
import { listUnseenGroupPostIds } from './unseenCounts';
import {
  AP_LIKE_REACTION,
  canManageEventRsvps,
  capacityRsvpDecision,
  eventDataForDbUpdate,
  type WaitlistSyncPlan,
  getEffectiveRsvp,
  instanceRsvpIdsForProfile,
  isOneToOneDm,
  normalizeEventDataForSave,
  overlaySeriesRsvpEntries,
  participantIds,
  passThroughUndefined,
  rsvpCancelNotice,
  sameRecurrenceId,
} from '@openpeepshq/common/lib';
import { forbidden, unprocessableRequest } from '../errors';
import { areBlocked, hasBlockAmong } from '../profiles/blocks';
import {
  rebuildEventOccurrences,
  clearEventOccurrences,
} from './eventOccurrences';
import { cancelPollEnd, schedulePollEnd } from './pollEndJobs';
import { publishWaitlistPlans } from './waitlistOfferJobs';
import {
  capacitySyncTargets,
  syncCapacityOccurrences,
  withRsvpCapacityLock,
} from './waitlist';
import { config } from '../config';
import { localObjectScalars } from '../federation/identity';

export const createPost = async (
  data: PostDataUnion,
  profile: Profile,
  postData: PostData,
  relations: {
    inReplyToId?: string | null;
    repostId?: string;
    audience?: Profile[] | null;
    groupId?: string | null;
  } = {},
): Promise<PostWithMeta> => {
  if (data.type === 'event') {
    data = normalizeEventDataForSave(data);
  }

  const { db } = await allpeepDb();

  const repostedPost = relations.repostId
    ? await postsMapping.find(db, relations.repostId)
    : undefined;

  const repliedToPost = relations.inReplyToId
    ? await postsMapping.find(db, relations.inReplyToId)
    : undefined;

  if (repliedToPost) {
    postData.visibility = repliedToPost.visibility;
  }

  if (
    repliedToPost &&
    (await areBlocked(db, profile.id, repliedToPost.creatorId))
  ) {
    throw forbidden({ errorKey: 'error.cannotInteractBlocked' });
  }

  const audienceIds = [
    profile.id,
    ...(relations.audience ?? []).map((member) => member.id),
  ];
  if (await hasBlockAmong(db, audienceIds)) {
    throw forbidden({ errorKey: 'error.cannotInteractBlocked' });
  }

  const group = await (repliedToPost?.group ||
    (relations.groupId ? findGroup(relations.groupId) : undefined));
  // Group-linked posts always use visibility=group so community/local feeds
  // (which only include public/local) never surface them incorrectly.
  if (group) {
    postData = { ...postData, visibility: 'group' };
  }
  const hashtags = extractHashtags(data);
  const id = uuidv7();
  const domain = (await config()).activityPub.defaultDomain;
  const object = localObjectScalars(id, domain, relations.inReplyToId);

  const post = await postsMapping.removeDefaultFilter().create(db, {
    id,
    ...postData,
    ...object,
    data,
    type: data.type,
    creatorId: profile.id,
  });

  await entryConnector(db, profile, post, {
    type: 'create',
    data,
  });

  if (repliedToPost) {
    await replyConnector(db, post, repliedToPost);
    await bumpConversationActivity(db, post.id);
  }

  if (group) {
    await groupConnector(db, post, group);
  }

  if (repostedPost && !repostedPost.repost) {
    await repostConnector(db, post, repostedPost);
  }

  await Promise.all(
    hashtags.map(async (tag) => {
      const hashtag = await findOrCreateHashtag(tag);
      await hashtagConnector(db, post, hashtag);
    }),
  );

  const mentions = await resolveMentionsForPost(data);

  if (mentions.length) {
    await Promise.all(
      mentions.map(async (mention) =>
        mentionConnector(db, post, mention.profile, { text: mention.text }),
      ),
    );
  }

  const audienceToLink = relations.audience?.length
    ? relations.audience
    : repliedToPost?.audience;
  if (audienceToLink?.length) {
    await Promise.all(
      audienceToLink.map(async (member) => {
        await audienceConnector(db, post, member);
      }),
    );
  }

  const newPost = await postsMapping.find(db, post.id);
  const transformedPost = await transformPost(newPost!);

  if (data.type === 'event') {
    await rebuildEventOccurrences(transformedPost.id, data);
  }

  if (data.type === 'question') {
    await schedulePollEnd(transformedPost.id, data.expiresAt);
  }

  hub.emit('postCreated', transformedPost);

  return transformedPost;
};

export const updatePost = async (
  post: PostWithMeta,
  profile: Profile,
  data: PostDataUnion,
) => {
  const previousEvent = post.data?.type === 'event' ? post.data : undefined;
  const normalized =
    data.type === 'event' ? normalizeEventDataForSave(data) : data;
  const dataForDb =
    normalized.type === 'event'
      ? eventDataForDbUpdate(previousEvent, normalized)
      : normalized;

  const { db } = await allpeepDb();

  post.tags.forEach((hashtag) =>
    hashtagDisconnector(db, post, hashtag as Hashtag),
  );

  const hashtags = extractHashtags(normalized);

  await Promise.all(
    hashtags.map(async (tag) => {
      const hashtag = await findOrCreateHashtag(tag);
      await hashtagConnector(db, post, hashtag);
    }),
  );

  await entryConnector(db, profile, post, {
    type: 'edit',
    data: normalized,
  });

  await postsMapping.update(db, post.id, {
    data: dataForDb as PostDataUnion,
  });

  const newPost = await postsMapping
    .find(db, post.id)
    .then(passThroughUndefined(transformPost));

  if (normalized.type === 'event') {
    await rebuildEventOccurrences(post.id, normalized);
  }

  if (normalized.type === 'question') {
    await schedulePollEnd(post.id, normalized.expiresAt);
  } else {
    await cancelPollEnd(post.id);
  }

  hub.emit('postUpdated', newPost, previousEvent?.jam?.moderators ?? []);

  return newPost!;
};

export const reactToPost = async (
  post: PostWithMeta,
  profile: Profile,
  data: ReactionData,
) =>
  allpeepDb().then(({ db }) =>
    entryConnector(db, profile, post, {
      type: 'reaction',
      data: { reaction: data.reaction },
    }).then(() =>
      hub.emit('reactionCreated', profile, post, {
        type: 'reaction',
        ...data,
      }),
    ),
  );

export const retractReaction = async (post: PostWithMeta, profile: Profile) =>
  allpeepDb().then(({ db }) =>
    entryConnector(db, profile, post, {
      type: 'unreaction',
      data: { reaction: AP_LIKE_REACTION },
    }),
  );

export const bookmarkPost = async (post: PostWithMeta, profile: Profile) =>
  allpeepDb().then(({ db }) =>
    bookmarkConnector(db, profile, post).then(() =>
      hub.emit('bookmarkCreated', profile, post),
    ),
  );

export const unbookmarkPost = async (post: PostWithMeta, profile: Profile) =>
  allpeepDb().then(({ db }) => bookmarkDisconnector(db, profile, post));

export const markPostsSeen = async (
  posts: { id: string }[],
  profile: Profile,
) => {
  if (posts.length === 0) return;
  const { db } = await allpeepDb();
  const ts = nowIso();
  await db.insert(postSeen).values(
    posts.map((post) => ({
      id: uuidv7(),
      fromId: profile.id,
      toId: post.id,
      body: {},
      createdAt: ts,
      updatedAt: ts,
    })),
  );
};

export const markGroupPostsSeen = async (
  authData: AuthorizationData,
  groupId: string,
) => {
  if (!authData.profile) {
    throw new Error('Profile required');
  }

  const profile = authData.profile;
  const { db } = await allpeepDb();
  const unseenIds = await listUnseenGroupPostIds(db, profile.id, groupId);
  await markPostsSeen(
    unseenIds.map((id) => ({ id })),
    profile,
  );
};

export const deletePost = async (post: PostWithMeta, profile: Profile) => {
  const { db } = await allpeepDb();

  await entryConnector(db, profile, post, {
    type: 'delete',
    data: {
      type: 'tombstone',
    },
  });

  await postsMapping.deleteRelations(db, post.id, {
    ...repostRelation,
    direction: 'INBOUND',
  });

  await postsMapping.delete(db, post.id);

  if (post.type === 'event') {
    await clearEventOccurrences(post.id);
  }

  if (post.type === 'question') {
    await cancelPollEnd(post.id);
  }

  return postsMapping.find(db, post.id);
};

export const validatePollVote = (post: PostWithMeta, data: Answer): void => {
  if (post.data?.type !== 'question') return;
  const question = post.data;
  if (
    question.expiresAt &&
    Date.now() > new Date(question.expiresAt).getTime()
  ) {
    throw forbidden({ errorKey: 'error.pollClosed' });
  }
  const multiple = question.multiple ?? false;
  const optionsCount = question.options.length;
  // Empty selection is allowed — it clears an existing vote (undo).
  if (data.selection.length === 0) return;
  if (!multiple && data.selection.length !== 1) {
    throw unprocessableRequest({
      errorKey: 'error.invalidPollVote',
      parameters: { reason: 'singleChoiceRequired' },
    });
  }
  const seen = new Set<number>();
  for (const index of data.selection) {
    if (index < 0 || index >= optionsCount) {
      throw unprocessableRequest({
        errorKey: 'error.invalidPollVote',
        parameters: { reason: 'optionOutOfRange' },
      });
    }
    if (seen.has(index)) {
      throw unprocessableRequest({
        errorKey: 'error.invalidPollVote',
        parameters: { reason: 'duplicateOption' },
      });
    }
    seen.add(index);
  }
};

export const vote = async (
  profile: Profile,
  post: PostWithMeta,
  data: Answer,
) => {
  validatePollVote(post, data);
  const { db } = await allpeepDb();
  await entryConnector(db, profile, post, {
    type: 'answer',
    data,
  });
  await hub.emit('entryCreated', profile, post, { type: 'answer', data });
};

const attendingRsvp = (response?: RsvpResponse) =>
  response === 'yes' || response === 'tentative';

const rsvpOccurrenceIds = (data: RsvpRequest): string[] | undefined => {
  if (data.recurrenceIds?.length) return data.recurrenceIds;
  if (data.recurrenceId) return [data.recurrenceId];
  return undefined;
};

const latestOwnResponse = (
  post: PostWithMeta,
  profileId: string,
  occurrenceIds?: string[],
): RsvpResponse | undefined => {
  const previousResponses = occurrenceIds
    ? occurrenceIds.map((id) => getEffectiveRsvp(post, profileId, id)?.response)
    : undefined;
  if (previousResponses) {
    return previousResponses.every(attendingRsvp)
      ? previousResponses[0]
      : previousResponses.find((response) => !attendingRsvp(response));
  }
  return [...(post.rsvps ?? [])]
    .filter((rsvp) => rsvp.profile.id === profileId)
    .filter((rsvp) => !rsvp.recurrenceId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.response;
};

const rsvpWrites = (
  post: PostWithMeta,
  profileId: string,
  response: RsvpResponse,
  occurrenceIds?: string[],
): RSVP[] => {
  if (response === 'waitlist') {
    const waitlistJoinedAt = new Date().toISOString();
    return occurrenceIds?.length
      ? occurrenceIds.map((recurrenceId) => ({
          response,
          recurrenceId,
          waitlistJoinedAt,
        }))
      : [{ response, waitlistJoinedAt }];
  }
  return occurrenceIds
    ? occurrenceIds.map((recurrenceId) => ({ response, recurrenceId }))
    : overlaySeriesRsvpEntries(
        response,
        instanceRsvpIdsForProfile(post, profileId),
      );
};

const publishCapacityPlans = async (
  postId: string,
  fromProfileId: string | undefined,
  plans: WaitlistSyncPlan[],
) => {
  if (!plans.length) return;
  await publishWaitlistPlans(postId, fromProfileId, plans).catch(
    () => undefined,
  );
};

export const rsvpRespond = async (
  profile: Profile,
  post: PostWithMeta,
  data: RsvpRequest,
) => {
  if (profile.id === post.profile.id) {
    return;
  }

  if (post.type !== 'event' || post.data?.type !== 'event') {
    throw unprocessableRequest({ errorKey: 'error.unprocessableRequest' });
  }

  // `removed` is an organizer-only status; users cannot set it on themselves,
  // and once removed they may not change their own RSVP — only the owner or a
  // moderator can restore it (see `rsvpManageByOrganizer`).
  if (data.response === 'removed') {
    throw forbidden({ errorKey: 'error.rsvpRemovedForbidden' });
  }

  const occurrenceIds = rsvpOccurrenceIds(data);
  if (!post.data.maxAttendees) {
    if (getEffectiveRsvp(post, profile.id)?.response === 'removed') {
      throw forbidden({ errorKey: 'error.rsvpRemoved' });
    }
    if (data.response === 'waitlist') {
      throw unprocessableRequest({ errorKey: 'error.eventWaitlistNotOpen' });
    }
    await writeRsvpResponse(profile, post, data.response, occurrenceIds);
    return;
  }

  const plans: WaitlistSyncPlan[] = [];
  let emitted:
    | {
        previousResponse?: RsvpResponse;
        occurrenceIds?: string[];
        cancel?: ReturnType<typeof rsvpCancelNotice>;
      }
    | undefined;
  let failure: unknown;
  try {
    await withRsvpCapacityLock(post.id, async () => {
      const loaded = await findPost(post.id);
      if (!loaded || loaded.data?.type !== 'event') {
        throw unprocessableRequest({ errorKey: 'error.unprocessableRequest' });
      }
      if (getEffectiveRsvp(loaded, profile.id)?.response === 'removed') {
        throw forbidden({ errorKey: 'error.rsvpRemoved' });
      }

      const prepared = await syncCapacityOccurrences(
        loaded.id,
        capacitySyncTargets(loaded, occurrenceIds),
      );
      plans.push(...prepared.plans);
      const fresh = prepared.post;
      if (!fresh || fresh.data?.type !== 'event') {
        throw unprocessableRequest({ errorKey: 'error.unprocessableRequest' });
      }

      const decision = capacityRsvpDecision(
        fresh,
        profile.id,
        data.response,
        occurrenceIds,
      );
      if (!decision.ok) {
        throw unprocessableRequest({ errorKey: decision.errorKey });
      }
      if (decision.occurrenceIds && decision.occurrenceIds.length === 0) {
        return;
      }

      const writeIds = decision.occurrenceIds;
      const previousResponse = latestOwnResponse(fresh, profile.id, writeIds);
      const writes = rsvpWrites(fresh, profile.id, data.response, writeIds);
      const { db } = await allpeepDb();
      for (const entry of writes) {
        await entryConnector(db, profile, fresh, {
          type: 'rsvp',
          data: entry,
        });
      }
      const cancel = rsvpCancelNotice(
        fresh,
        profile.id,
        data.response,
        writeIds,
      );
      const settled = await syncCapacityOccurrences(
        fresh.id,
        capacitySyncTargets(fresh, writeIds),
      );
      plans.push(...settled.plans);
      if (data.response === 'yes') {
        const claimed = writeIds?.length ? writeIds : [undefined];
        plans.push({
          requeues: [],
          withdraws: [],
          offers: [],
          clearOffers: claimed.map((recurrenceId) => ({
            profileId: profile.id,
            recurrenceId,
          })),
        });
      }
      emitted = { previousResponse, occurrenceIds: writeIds, cancel };
    });
  } catch (err) {
    failure = err;
  }

  await publishCapacityPlans(post.id, post.profile.id, plans);
  if (failure) throw failure;
  if (!emitted) return;

  hub.emit('rsvpCreated', profile, post, {
    type: 'rsvp',
    data: {
      response: data.response,
      ...(emitted.occurrenceIds?.length === 1
        ? { recurrenceId: emitted.occurrenceIds[0] }
        : {}),
    },
    occurrenceIds: emitted.occurrenceIds,
    previousResponse: emitted.previousResponse,
    ...(emitted.cancel ? { cancel: emitted.cancel } : {}),
  });
};

const writeRsvpResponse = async (
  profile: Profile,
  post: PostWithMeta,
  response: RsvpResponse,
  occurrenceIds?: string[],
) => {
  const previousResponse = latestOwnResponse(post, profile.id, occurrenceIds);
  const writes = rsvpWrites(post, profile.id, response, occurrenceIds);
  const { db } = await allpeepDb();
  for (const entry of writes) {
    await entryConnector(db, profile, post, {
      type: 'rsvp',
      data: entry,
    });
  }
  const cancel = rsvpCancelNotice(post, profile.id, response, occurrenceIds);
  hub.emit('rsvpCreated', profile, post, {
    type: 'rsvp',
    data: {
      response,
      ...(occurrenceIds?.length === 1
        ? { recurrenceId: occurrenceIds[0] }
        : {}),
    },
    occurrenceIds,
    previousResponse,
    ...(cancel ? { cancel } : {}),
  });
};

export const rsvpManageByOrganizer = async (
  actingProfile: Profile,
  targetProfile: Profile,
  post: PostWithMeta,
  response: Extract<RsvpResponse, 'removed' | 'yes'>,
  recurrenceId?: string,
) => {
  if (!canManageEventRsvps(actingProfile, post)) {
    throw forbidden({ errorKey: 'forbidden' });
  }

  if (targetProfile.id === post.profile.id) {
    throw forbidden({ errorKey: 'forbidden' });
  }

  if (post.type !== 'event' || post.data?.type !== 'event') {
    throw unprocessableRequest({ errorKey: 'error.unprocessableRequest' });
  }

  const data: RSVP = { response, recurrenceId };
  // Capacity events now enforce waitlist capacity checks even for organizer-managed
  // RSVPs: an organizer cannot force 'yes' beyond the capacity window when the
  // waitlist is active. Non-capacity events skip the lock entirely.
  const capacity = !!post.data.maxAttendees;
  if (!capacity) {
    const { db } = await allpeepDb();
    const previousResponse = organizerPreviousResponse(
      post,
      targetProfile.id,
      recurrenceId,
    );
    await entryConnector(db, targetProfile, post, { type: 'rsvp', data });
    hub.emit('rsvpCreated', targetProfile, post, {
      type: 'rsvp',
      data,
      previousResponse,
    });
    return;
  }

  const plans: WaitlistSyncPlan[] = [];
  let previousResponse: RsvpResponse | undefined;
  let failure: unknown;
  try {
    await withRsvpCapacityLock(post.id, async () => {
      const loaded = await findPost(post.id);
      if (!loaded || loaded.data?.type !== 'event') {
        throw unprocessableRequest({ errorKey: 'error.unprocessableRequest' });
      }
      const targets = capacitySyncTargets(
        loaded,
        recurrenceId ? [recurrenceId] : undefined,
      );
      const prepared = await syncCapacityOccurrences(loaded.id, targets);
      plans.push(...prepared.plans);
      const fresh = prepared.post ?? loaded;
      if (response === 'yes') {
        const decision = capacityRsvpDecision(
          fresh,
          targetProfile.id,
          'yes',
          recurrenceId ? [recurrenceId] : undefined,
        );
        if (!decision.ok) {
          throw unprocessableRequest({ errorKey: decision.errorKey });
        }
      }
      previousResponse = organizerPreviousResponse(
        fresh,
        targetProfile.id,
        recurrenceId,
      );
      const { db } = await allpeepDb();
      await entryConnector(db, targetProfile, fresh, { type: 'rsvp', data });
      const settled = await syncCapacityOccurrences(fresh.id, targets);
      plans.push(...settled.plans);
      if (response === 'yes') {
        plans.push({
          requeues: [],
          withdraws: [],
          offers: [],
          clearOffers: [{ profileId: targetProfile.id, recurrenceId }],
        });
      }
    });
  } catch (err) {
    failure = err;
  }

  await publishCapacityPlans(post.id, post.profile.id, plans);
  if (failure) throw failure;
  hub.emit('rsvpCreated', targetProfile, post, {
    type: 'rsvp',
    data,
    previousResponse,
  });
};

const organizerPreviousResponse = (
  post: PostWithMeta,
  profileId: string,
  recurrenceId?: string,
) =>
  [...(post.rsvps ?? [])]
    .filter((rsvp) => rsvp.profile.id === profileId)
    .filter((rsvp) =>
      recurrenceId
        ? sameRecurrenceId(rsvp.recurrenceId, recurrenceId) ||
          !rsvp.recurrenceId
        : !rsvp.recurrenceId,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.response;

/**
 * Remove a profile from a direct-message conversation.
 *
 * - Creates a system "X left" post (empty content) with the *remaining*
 *   participants as audience. The leaving user is excluded so future
 *   replies (which inherit the audience) won't notify them, and the thread
 *   disappears from their inbox.
 * - MessageInThread detects the leave via the audience diff: the leaving
 *   user was in the previous post's audience but not in the left-post's.
 * - The conversation post-creation endpoint detects leavers (author not in
 *   their own post's audience) to block further posting and exclude them
 *   from future replies' audience.
 * - A 1:1 conversation can span several roots, so each root's thread gets
 *   its own "left" post — otherwise the leaver's inbox would keep the
 *   threads whose newest post is still in their audience.
 * - When the newest post's audience holds no one but the leaver (everyone
 *   else already left), removes the leaver from every post's audience of
 *   that root's thread instead of posting again.
 */
export const leaveConversation = async (
  rootPost: PostWithMeta,
  profile: ProfileWithMeta,
): Promise<void> => {
  const { db } = await allpeepDb();

  const participants = [...participantIds(rootPost)];
  const isOneToOne = isOneToOneDm(rootPost);
  const rootLeaves = isOneToOne
    ? await listOneToOneConversationRootLeaves(
        db,
        participants[0]!,
        participants[1]!,
      )
    : [];

  const lastPostId = rootLeaves.length
    ? rootLeaves.reduce(
        (latest, { leafId }) => (leafId > latest ? leafId : latest),
        rootPost.id,
      )
    : await findLatestThreadPostId(rootPost.id);
  const [lastPost] =
    lastPostId === rootPost.id
      ? [rootPost]
      : await findPostsForAuth([lastPostId]);

  if (!lastPost) return;

  const remainingAudience =
    lastPost.audience?.filter((p) => p.id !== profile.id) ?? [];

  if (isOneToOne) {
    // Terminate every root's thread with the system "left" post so the
    // conversation vanishes from the leaver's inbox under all roots. The
    // fallback below covers a pair whose root does not match the pair
    // condition (e.g. legacy rows) and falls back to the requested thread.
    const leaves = rootLeaves.length
      ? rootLeaves
      : [{ rootId: rootPost.id, leafId: lastPostId }];
    for (const { leafId } of leaves) {
      await createPost(
        { type: 'note', content: '' },
        profile,
        { type: 'note', visibility: 'direct', creatorId: profile.id },
        {
          inReplyToId: leafId,
          audience: remainingAudience as unknown as Profile[],
        },
      );
    }
  } else if (remainingAudience.length > 0) {
    await createPost(
      { type: 'note', content: '' },
      profile,
      { type: 'note', visibility: 'direct', creatorId: profile.id },
      {
        inReplyToId: lastPost.id,
        audience: remainingAudience as unknown as Profile[],
      },
    );
  } else {
    // No one remains in the newest post's audience — remove the leaver from
    // every post's audience so the thread no longer appears in their inbox.
    await db.execute(sql`
      WITH RECURSIVE t AS (
        SELECT ${rootPost.id}::text AS id, 0 AS depth
        UNION ALL
        SELECT rt.from_id::text, t.depth + 1
        FROM reply_to rt
        INNER JOIN t ON rt.to_id = t.id
        WHERE t.depth < 9999
      )
      DELETE FROM audience
      WHERE from_id IN (SELECT id FROM t)
      AND to_id = ${profile.id}
    `);
  }

  await profilesCache.del(profile.id);
};
