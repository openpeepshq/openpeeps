export type AtDid = string;
export type AtUri = string;
export type AtHandle = string;
export type AtCid = string;

export const ATPROTO_COLLECTIONS = {
  profile: 'app.bsky.actor.profile',
  post: 'app.bsky.feed.post',
  follow: 'app.bsky.graph.follow',
  like: 'app.bsky.feed.like',
} as const;

export const ATPROTO_WRITE_COLLECTIONS = [
  ATPROTO_COLLECTIONS.profile,
  ATPROTO_COLLECTIONS.post,
  ATPROTO_COLLECTIONS.follow,
  ATPROTO_COLLECTIONS.like,
] as const;

export type AtprotoWriteCollection = (typeof ATPROTO_WRITE_COLLECTIONS)[number];
