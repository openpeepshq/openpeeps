/**
 * Pure parsing of the content routes the crawler layer recognises. Kept free of
 * data-layer imports so the rules are unit-testable and so this can be loaded
 * where opening a database connection would be wrong.
 */
import { isHandleShapedSlug } from '@openpeepshq/common/lib';

export type SeoRouteKind = 'post' | 'group' | 'profile' | 'slug';

export type SeoRoute =
  | { kind: 'post'; handle: string }
  | { kind: 'group'; handle: string }
  | { kind: 'profile'; handle: string }
  | {
      kind: 'slug';
      /** The article slug as written in the path. */
      slug: string;
      /** Profile-scoped slugs resolve against this profile's handle. */
      handle?: string;
      instanceScoped: boolean;
    };

/**
 * Top-level segments that own a route in the web app and therefore can never
 * be a slug path. Kept in sync with `platform/web` routes.
 */
export const RESERVED_TOP_LEVEL_ROUTES = [
  'about',
  'articles',
  'auth',
  'admin',
  'code-of-conduct',
  'conversations',
  'docs',
  'events',
  'explore',
  'feeds',
  'groups',
  'home',
  'jams',
  'members',
  'notifications',
  'payment',
  'plugins',
  'posts',
  'resources',
  'settings',
  'tags',
  'test',
  'welcome',
];

/**
 * A profile handle is 1–16 characters of `[a-zA-Z0-9_-]`, so the web router's
 * `/:handle` route owns every bare slug-shaped segment of length ≤ 16 (a slug
 * is lowercase/digits/hyphens only, a subset of handle shape). Such a segment
 * can never resolve as an instance-scoped slug — `/my-slug` loads the profile
 * page for handle `my-slug`, or 404s. Longer slug-shaped segments can be no
 * handle, so only those qualify as instance slugs. The plugin's availability
 * check enforces the same rule at write time. The shape is shared from
 * `@openpeepshq/common/lib` (single source of truth).
 */
export const isHandleShaped = isHandleShapedSlug;

/** Profile sub-routes the web router owns under `/:handle/<x>`. */
export const RESERVED_PROFILE_SUBROUTES = ['followers', 'following'];

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

  // Only the `/@handle` profile route is gated by `indexProfiles`; article
  // slugs (below) are post routes and resolve regardless, matching the sitemap.
  if (indexProfiles) {
    const profile = /^\/@([^/]+?)\/?$/.exec(pathname)?.[1];
    if (profile) return { kind: 'profile', handle: profile };
  }

  // Article slugs are post routes, not profile routes: a slug URL is a clean
  // spelling of an article that `crawlableEntries()` always advertises in the
  // sitemap (posts are never gated by `indexProfiles`). So slug recognition
  // must run regardless of the flag — otherwise a community with profile
  // indexing off would advertise `/{slug}` in its sitemap while the meta and
  // canonical-redirect resolvers treat it as a non-route.
  //
  // Profile-scoped article slug: `/{handle}/{slug}` (or `/@handle/{slug}`).
  // The handle may not be a real profile — the slug finder then resolves
  // nothing, which is the same as a route that was never recognised.
  const profileSlug = /^\/(?:@)?([^/]+)\/([\w-]+)\/?$/.exec(pathname);
  if (
    profileSlug &&
    !RESERVED_TOP_LEVEL_ROUTES.includes(profileSlug[1]) &&
    !RESERVED_PROFILE_SUBROUTES.includes(profileSlug[2])
  ) {
    return {
      kind: 'slug',
      handle: profileSlug[1],
      slug: profileSlug[2],
      instanceScoped: false,
    };
  }

  // Instance-scoped article slug: bare `/{slug}`. Handle-shaped segments are
  // owned by the `/:handle` profile route, so only the rest qualify.
  const instanceSlug = /^\/([\w-]+)\/?$/.exec(pathname)?.[1];
  if (
    instanceSlug &&
    !RESERVED_TOP_LEVEL_ROUTES.includes(instanceSlug) &&
    !isHandleShaped(instanceSlug)
  ) {
    return { kind: 'slug', slug: instanceSlug, instanceScoped: true };
  }

  return null;
};
