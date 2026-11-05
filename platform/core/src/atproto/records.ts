import { createHash, randomBytes } from 'node:crypto';
import { parseAtUriString } from '@atproto/syntax';
import { cidForRecord as dagCborCidForRecord } from '@atproto/repo';
import { ATPROTO_COLLECTIONS } from '@openpeepshq/common/types';
import type { PostWithMeta, Profile } from '@openpeepshq/common/types';
import { AP_LIKE_REACTION } from '@openpeepshq/common/lib';

export const COLLECTIONS = ATPROTO_COLLECTIONS;

export const isProjectablePublicNote = (post: {
  type: string;
  visibility: string;
  deletedAt?: string | null;
}) =>
  post.type === 'note' &&
  post.visibility === 'public' &&
  post.deletedAt == null;

export const atUriFor = (did: string, collection: string, rkey: string) =>
  `at://${did}/${collection}/${rkey}`;

export const parseAtUri = (uri: string) => {
  const parsed = parseAtUriString(uri);
  if (!parsed.success) return null;
  if (!parsed.value.collection || !parsed.value.rkey) return null;
  return {
    did: parsed.value.authority,
    collection: parsed.value.collection,
    rkey: parsed.value.rkey,
  };
};

export const nextRkey = () => {
  const time = BigInt(Date.now()) * 1000n;
  const clock = BigInt(randomBytes(2).readUInt16BE(0) & 1023);
  return ((time << 10n) | clock).toString(32).padStart(13, '0').slice(-13);
};

export const rkeyFromPostId = (postId: string) => {
  const hex = createHash('sha256').update(postId).digest('hex').slice(0, 12);
  return `3${hex}`;
};

export type StrongRef = { uri: string; cid: string };

export const cidForRecord = async (value: unknown) =>
  (await dagCborCidForRecord(value)).toString();

export const postToFeedPost = (
  post: PostWithMeta,
  createdAt: string,
  reply?: { root: StrongRef; parent: StrongRef },
) => {
  const data = post.data as { content?: string } | undefined;
  return {
    $type: COLLECTIONS.post,
    text: data?.content ?? '',
    createdAt,
    ...(reply
      ? {
          reply: {
            root: reply.root,
            parent: reply.parent,
          },
        }
      : {}),
  };
};

export const profileToActorProfile = (profile: Profile) => ({
  $type: COLLECTIONS.profile,
  displayName: profile.displayName ?? profile.handle,
  description: profile.bio ?? '',
});

export const followToGraphFollow = (subjectDid: string, createdAt: string) => ({
  $type: COLLECTIONS.follow,
  subject: subjectDid,
  createdAt,
});

export const likeToFeedLike = (subject: StrongRef, createdAt: string) => ({
  $type: COLLECTIONS.like,
  subject,
  createdAt,
});

export const isDesignatedLike = (reaction: string) =>
  reaction === AP_LIKE_REACTION;

export const feedPostText = (record: unknown) => {
  if (!record || typeof record !== 'object') return '';
  const text = (record as { text?: unknown }).text;
  return typeof text === 'string' ? text : '';
};

export const feedPostReplyParent = (record: unknown) => {
  if (!record || typeof record !== 'object') return null;
  const reply = (record as { reply?: { parent?: { uri?: string } } }).reply;
  return reply?.parent?.uri ?? null;
};
