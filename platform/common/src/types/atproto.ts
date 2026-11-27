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

export type AtprotoCollection =
  (typeof ATPROTO_COLLECTIONS)[keyof typeof ATPROTO_COLLECTIONS];
