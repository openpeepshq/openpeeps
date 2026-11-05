import {
  AP_LIKE_REACTION,
  checkRoleCapabilities,
} from '@openpeepshq/common/lib';
import { ATPROTO_COLLECTIONS } from '@openpeepshq/common/types';
import type { Role } from '@openpeepshq/common/types';
import {
  deleteProjectedRecord,
  findPostIdByAtUri,
  findProfileByDid,
  projectFollow,
  projectLike,
  projectPublicNote,
  storeBlob,
} from '@openpeepshq/core/atproto';
import type { AtprotoSessionClaims } from '@openpeepshq/core/atproto';
import { findProfile, follow } from '@openpeepshq/core/profiles';
import {
  createPost,
  deletePost,
  findPost,
  reactToPost,
} from '@openpeepshq/core/posts';

export const WRITE_COLLECTIONS = new Set<string>([
  ATPROTO_COLLECTIONS.profile,
  ATPROTO_COLLECTIONS.post,
  ATPROTO_COLLECTIONS.follow,
  ATPROTO_COLLECTIONS.like,
]);

export const canCreatePublicNote = (roles: Role[]) =>
  checkRoleCapabilities(roles, ['core-posts-create-note-public']).success;

export const createRecordForSession = async (
  claims: AtprotoSessionClaims,
  input: {
    collection: string;
    rkey?: string;
    record: Record<string, unknown>;
  },
) => {
  if (!WRITE_COLLECTIONS.has(input.collection)) {
    throw new Error('Collection not allowed');
  }
  const profile = await findProfile(claims.profileId);
  if (!profile) throw new Error('Unknown profile');
  if (input.collection === ATPROTO_COLLECTIONS.post) {
    if (!canCreatePublicNote(profile.roles)) {
      throw new Error('Missing core-posts-create-note-public');
    }
    const text = typeof input.record.text === 'string' ? input.record.text : '';
    const post = await createPost(
      { type: 'note', content: text },
      profile,
      { type: 'note', visibility: 'public', creatorId: profile.id },
      {},
    );
    const projected = await projectPublicNote(post);
    if (!projected) throw new Error('Failed to project public note');
    return projected;
  }
  if (input.collection === ATPROTO_COLLECTIONS.follow) {
    const subject =
      typeof input.record.subject === 'string' ? input.record.subject : '';
    const followed = await findProfileByDid(subject);
    if (!followed) throw new Error('Unknown subject');
    await follow(profile, followed, { reblogs: true, notify: true });
    const projected = await projectFollow(profile, followed);
    if (projected) return projected;
    return {
      uri: `at://${claims.did}/${input.collection}/${input.rkey ?? 'follow'}`,
      cid: '',
    };
  }
  if (input.collection === ATPROTO_COLLECTIONS.like) {
    const subject = input.record.subject as { uri?: string } | undefined;
    const postId = subject?.uri ? await findPostIdByAtUri(subject.uri) : null;
    if (!postId) throw new Error('Unknown subject');
    const post = await findPost(postId);
    if (!post) throw new Error('Unknown subject');
    await reactToPost(post, profile, { reaction: AP_LIKE_REACTION });
    const projected = await projectLike(profile, post, AP_LIKE_REACTION);
    if (projected) return projected;
    return {
      uri: `at://${claims.did}/${input.collection}/${input.rkey ?? 'like'}`,
      cid: '',
    };
  }
  return { uri: `at://${claims.did}/${input.collection}/self`, cid: '' };
};

export const deleteRecordForSession = async (
  claims: AtprotoSessionClaims,
  input: { collection: string; rkey: string },
) => {
  if (!WRITE_COLLECTIONS.has(input.collection)) {
    throw new Error('Collection not allowed');
  }
  const profile = await findProfile(claims.profileId);
  if (!profile) throw new Error('Unknown profile');
  const uri = `at://${claims.did}/${input.collection}/${input.rkey}`;
  if (input.collection === ATPROTO_COLLECTIONS.post) {
    const postId = await findPostIdByAtUri(uri);
    const post = postId ? await findPost(postId) : undefined;
    if (post) await deletePost(post, profile);
  }
  await deleteProjectedRecord(claims.did, input.collection, input.rkey);
  return { uri, success: true };
};

export const uploadBlobForSession = async (
  claims: AtprotoSessionClaims,
  bytes: Uint8Array,
  mimeType?: string,
) => storeBlob({ did: claims.did, bytes, mimeType });
