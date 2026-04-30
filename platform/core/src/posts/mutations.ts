import {
  Answer,
  Hashtag,
  PostWithMeta,
  PostData,
  Profile,
  ReactionData,
  RSVP,
  MentionWithPublicProfile,
} from '@openpeeps/common/types';

import { PostDataUnion } from "@openpeeps/common/types";
import { allpeepDb } from "../db";
import { audienceConnector, bookmarkConnector, bookmarkDisconnector, entryConnector, extractHashtags, groupConnector, hashtagConnector, hashtagDisconnector, mentionConnector, postSeenConnector, reactionConnector, reactionDisconnector, replyConnector, repostConnector, transformPost } from "./helpers";
import { postsMapping, repostRelation } from "./mapping";
import { findGroup } from "../groups/finders";
import { findOrCreateHashtag } from "../hashtags";
import { hub } from "../events";
import { passThroughUndefined } from '@openpeeps/common/lib';

export const createPost = async (
  data: PostDataUnion,
  profile: Profile,
  postData: PostData,
  relations: {
    inReplyToId?: string | null;
    repostId?: string;
    mentions?: MentionWithPublicProfile[] | null;
    audience?: Profile[] | null;
    groupId?: string | null;
  } = {},
): Promise<PostWithMeta> => {
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
    findGroup(relations.groupId ?? ''));
  const hashtags = extractHashtags(data);

  const post = await postsMapping.removeDefaultFilter().create(db, { ...postData, data, type: data.type, creatorId: profile.id });

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

  await Promise.all(hashtags.map(async (tag) => {
    const hashtag = await findOrCreateHashtag(tag);
    await hashtagConnector(db, post, hashtag);
  }));

  if (relations.mentions) {
    await Promise.all(relations.mentions.map(async (mention) =>
      mentionConnector(db, post, mention.profile, { text: mention.text })
    ));
  }

  if (relations.audience) {
    await Promise.all(relations.audience.map(async (profile) => {
      await audienceConnector(db, post, profile);
    }));
  }

  const newPost = await postsMapping.find(db, post.id);
  const transformedPost = await transformPost(newPost!);

  hub.emit('postCreated', transformedPost);

  return transformedPost;
};

export const updatePost = async (
  post: PostWithMeta,
  profile: Profile,
  data: PostDataUnion,
) => {
  const { db } = await allpeepDb();

  post.tags.forEach((hashtag) => hashtagDisconnector(db, post, hashtag as Hashtag));

  const hashtags = extractHashtags(data);

  await Promise.all(hashtags.map(async (tag) => {
    const hashtag = await findOrCreateHashtag(tag);
    await hashtagConnector(db, post, hashtag);
  }));

  await entryConnector(db, profile, post, {
    type: 'edit',
    data,
  });

  await postsMapping.update(db, post.id, { data });

  const newPost = await postsMapping.find(db, post.id).then(passThroughUndefined(transformPost));

  hub.emit('postUpdated', newPost);

  return newPost!;
};

export const reactToPost = async (post: PostWithMeta, profile: Profile, data: ReactionData) =>
  allpeepDb()
    .then(({ db }) => reactionConnector(db, profile, post, data)
      .then(() => hub.emit('reactionCreated', profile, post, { type: 'reaction', ...data })));

export const retractReaction = async (post: PostWithMeta, profile: Profile) =>
  allpeepDb().then(({ db }) => reactionDisconnector(db, profile, post));

export const bookmarkPost = async (post: PostWithMeta, profile: Profile) =>
  allpeepDb()
    .then(({ db }) => bookmarkConnector(db, profile, post)
      .then(() => hub.emit('bookmarkCreated', profile, post)));

export const unbookmarkPost = async (post: PostWithMeta, profile: Profile) =>
  allpeepDb().then(({ db }) => bookmarkDisconnector(db, profile, post));

export const markPostsSeen = async (posts: PostWithMeta[], profile: Profile) => {
  const { db } = await allpeepDb();

  await Promise.all(posts.map((post) => postSeenConnector(db, profile, post)));
};

export const deletePost = async (post: PostWithMeta, profile: Profile) => {
  const { db } = await allpeepDb();

  await entryConnector(db, profile, post, {
    type: 'delete',
    data: {
      type: 'tombstone'
    },
  });

  await Promise.all(post.reactions.map(async (reaction) => {
    await reactionDisconnector(db, reaction.profile, post);
  }));

  await postsMapping.deleteRelations(db, post.id, {
    ...repostRelation,
    direction: 'INBOUND',
  });

  await postsMapping.delete(db, post.id);

  return postsMapping.find(db, post.id);
};

export const vote = (profile: Profile, post: PostWithMeta, data: Answer) =>
  allpeepDb().then(({ db }) =>
    entryConnector(db, profile, post, {
      type: 'answer',
      data,
    })
      .then(() => hub.emit('entryCreated', profile, post, { type: 'answer', data })));

export const rsvpRespond = async (
  profile: Profile,
  post: PostWithMeta,
  data: RSVP,
) => {
  if (profile.id === post.profile.id) {
    return
  }
  const { db } = await allpeepDb();

  await entryConnector(db, profile, post, {
    type: 'rsvp',
    data,
  });

  hub.emit('rsvpCreated', profile, post, { type: 'rsvp', data });
};