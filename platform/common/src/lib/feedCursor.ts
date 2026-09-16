export type FeedCursor = {
  id: string;
  lastActivityAt?: string;
};

/**
 * Timeline feeds page by `(lastActivityAt DESC, id DESC)`. Encode both in
 * `start` so a later bump cannot skip or duplicate rows across pages.
 * Id-sorted feeds (profile, bookmarks, hashtags) still work: they read `id`.
 */
export const encodeFeedCursor = (post: {
  id?: string;
  lastActivityAt?: string | null;
}): string | undefined => {
  if (!post.id) return undefined;
  return post.lastActivityAt ? `${post.lastActivityAt}|${post.id}` : post.id;
};

export const parseFeedCursor = (start?: string): FeedCursor | undefined => {
  if (!start) return undefined;
  const sep = start.lastIndexOf('|');
  if (sep <= 0) return { id: start };
  const lastActivityAt = start.slice(0, sep);
  const id = start.slice(sep + 1);
  if (!id) return { id: start };
  return { id, lastActivityAt };
};
