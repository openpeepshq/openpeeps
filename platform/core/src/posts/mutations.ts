import {
  AuthorizationData,
  Answer,
  Hashtag,
  PostWithMeta,
  PostData,
  Profile,
  ReactionData,
  RSVP,
  RsvpResponse,
} from '@openpeepshq/common/types';

import { PostDataUnion } from '@openpeepshq/common/types';
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
  reactionConnector,
  reactionDisconnector,
  replyConnector,
  repostConnector,
  resolveMentionsForPost,
  transformPost,
} from './helpers';
import { postsMapping, repostRelation } from './mapping';
import { findGroup } from '../groups/finders';
import { findOrCreateHashtag } from '../hashtags';
import { hub } from '../events';
import { listUnseenGroupPostIds } from './unseenCounts';
import {
  canManageEventRsvps,
  countYesRsvps,
  eventDataForDbUpdate,
  getEffectiveRsvp,
  normalizeEventDataForSave,
  passThroughUndefined,
  sameRecurrenceId,
} from '@openpeepshq/common/lib';
import { forbidden, unprocessableRequest } from '../errors';
import {
  rebuildEventOccurrences,
  clearEventOccurrences,
} from './eventOccurrences';

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

  const group = await (repliedToPost?.group ||
    (relations.groupId ? findGroup(relations.groupId) : undefined));
  // Group-linked posts always use visibility=group so community/local feeds
  // (which only include public/local) never surface them incorrectly.
  if (group) {
    postData = { ...postData, visibility: 'group' };
  }
  const hashtags = extractHashtags(data);

  const post = await postsMapping
    .removeDefaultFilter()
    .create(db, { ...postData, data, type: data.type, creatorId: profile.id });

  await entryConnector(db, profile, post, {
    type: 'create',
    data,
  });

  if (repliedToPost) {
    await replyConnector(db, post, repliedToPost);
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

  hub.emit('postUpdated', newPost);

  return newPost!;
};

export const reactToPost = async (
  post: PostWithMeta,
  profile: Profile,
  data: ReactionData,
) =>
  allpeepDb().then(({ db }) =>
    reactionConnector(db, profile, post, data).then(() =>
      hub.emit('reactionCreated', profile, post, { type: 'reaction', ...data }),
    ),
  );

export const retractReaction = async (post: PostWithMeta, profile: Profile) =>
  allpeepDb().then(({ db }) => reactionDisconnector(db, profile, post));

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
  await db
    .insert(postSeen)
    .values(
      posts.map((post) => ({
        id: uuidv7(),
        fromId: profile.id,
        toId: post.id,
        body: {},
        createdAt: ts,
        updatedAt: ts,
      })),
    )
    .onConflictDoNothing({
      target: [postSeen.fromId, postSeen.toId],
    });
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

  await Promise.all(
    post.reactions.map(async (reaction) => {
      await reactionDisconnector(db, reaction.profile, post);
    }),
  );

  await postsMapping.deleteRelations(db, post.id, {
    ...repostRelation,
    direction: 'INBOUND',
  });

  await postsMapping.delete(db, post.id);

  if (post.type === 'event') {
    await clearEventOccurrences(post.id);
  }

  return postsMapping.find(db, post.id);
};

export const vote = (profile: Profile, post: PostWithMeta, data: Answer) =>
  allpeepDb().then(({ db }) =>
    entryConnector(db, profile, post, {
      type: 'answer',
      data,
    }).then(() =>
      hub.emit('entryCreated', profile, post, { type: 'answer', data }),
    ),
  );

export const rsvpRespond = async (
  profile: Profile,
  post: PostWithMeta,
  data: RSVP,
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
  if (getEffectiveRsvp(post, profile.id)?.response === 'removed') {
    throw forbidden({ errorKey: 'error.rsvpRemoved' });
  }

  const maxAttendees = post.data.maxAttendees;
  if (maxAttendees) {
    if (data.response === 'tentative') {
      throw unprocessableRequest({
        errorKey: 'error.eventTentativeNotAllowed',
      });
    }
    if (data.response === 'yes') {
      const currentRsvp = getEffectiveRsvp(post, profile.id, data.recurrenceId);
      if (
        currentRsvp?.response !== 'yes' &&
        countYesRsvps(post, data.recurrenceId) >= maxAttendees
      ) {
        throw unprocessableRequest({ errorKey: 'error.eventAtCapacity' });
      }
    }
  }

  const { db } = await allpeepDb();

  const previousResponse = [...(post.rsvps ?? [])]
    .filter((rsvp) => rsvp.profile.id === profile.id)
    .filter((rsvp) =>
      data.recurrenceId
        ? sameRecurrenceId(rsvp.recurrenceId, data.recurrenceId) ||
          !rsvp.recurrenceId
        : !rsvp.recurrenceId,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.response;

  await entryConnector(db, profile, post, {
    type: 'rsvp',
    data,
  });

  hub.emit('rsvpCreated', profile, post, {
    type: 'rsvp',
    data,
    previousResponse,
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

  if (post.type !== 'event') {
    throw unprocessableRequest({ errorKey: 'error.unprocessableRequest' });
  }

  const data: RSVP = { response, recurrenceId };
  const { db } = await allpeepDb();

  const previousResponse = [...(post.rsvps ?? [])]
    .filter((rsvp) => rsvp.profile.id === targetProfile.id)
    .filter((rsvp) =>
      recurrenceId
        ? sameRecurrenceId(rsvp.recurrenceId, recurrenceId) ||
          !rsvp.recurrenceId
        : !rsvp.recurrenceId,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.response;

  await entryConnector(db, targetProfile, post, {
    type: 'rsvp',
    data,
  });

  hub.emit('rsvpCreated', targetProfile, post, {
    type: 'rsvp',
    data,
    previousResponse,
  });
};
