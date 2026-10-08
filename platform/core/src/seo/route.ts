/**
 * Pure parsing of the content routes the crawler layer recognises. Kept free of
 * data-layer imports so the rules are unit-testable and so this can be loaded
 * where opening a database connection would be wrong.
 */
export type SeoRouteKind = 'post' | 'group' | 'profile';

export type SeoRoute = { kind: SeoRouteKind; handle: string };

/**
 * A trailing slash addresses the same page as the bare path; `webNavigator`
 * never emits one, so the canonical spelling has none. Tolerating it here stops
 * `/posts/x/` from silently falling back to community-wide metadata.
 */
export const seoRoute = (
  pathname: string,
  { indexProfiles }: { indexProfiles: boolean },
): SeoRoute | null => {
  const post = /^\/posts\/([\w-]+)\/?$/.exec(pathname)?.[1];
  if (post) return { kind: 'post', handle: post };

  // Group and profile handles carry the leading @ in real URLs, and the web
  // client also accepts it absent, so both spellings resolve.
  const group = /^\/groups\/@?([^/]+?)\/?$/.exec(pathname)?.[1];
  if (group) return { kind: 'group', handle: group };

  if (!indexProfiles) return null;
  const profile = /^\/@([^/]+?)\/?$/.exec(pathname)?.[1];
  return profile ? { kind: 'profile', handle: profile } : null;
};
