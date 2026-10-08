import type { AuthorizationData } from '@openpeepshq/common/types';
import { capabilitiesConfig } from '../config';
import { findGroupByHandle, listGroups } from '../groups';
import { findPost, listPosts } from '../posts';
import { canReadPost } from '../posts/helpers/filters';
import { findProfileByHandle, listProfiles } from '../profiles';
import { getSharedConnection } from '../redis';
import { seoRoute } from './route';

/** A sitemap row: app-relative path plus modification time, when known. */
export type CrawlableEntry = {
  path: string;
  updatedAt?: string | null;
};

/** What a content page should be titled and summarised as, for crawlers. */
export type CrawlableMeta = {
  title: string;
  description: string;
  /** Post routes only: the extra facts DiscussionForumPosting needs. */
  kind?: 'post';
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
};

/**
 * Metadata plus whether the route could render at all, so the server can answer
 * 404 for a content path that will never show anything to a crawler instead of
 * a 200 community shell.
 */
export type SpaMeta = { meta: CrawlableMeta | null; notFound: boolean };

export { seoRoute, type SeoRoute, type SeoRouteKind } from './route';

/**
 * Per entity kind. `listPosts` runs each row through `transformPost`, which
 * hydrates reactions, mentions and thread previews we never render here, so the
 * cap is what keeps a crawler sweep from turning into a full content scan.
 */
const PER_KIND_LIMIT = 1_000;

// Versioned because the cached shape gained `notFound` and later the
// JSON-LD fields: an old entry must never be read as the new one during a
// rolling restart.
const META_CACHE_PREFIX = 'seo:meta:v3:';
const META_TTL_SECONDS = 5 * 60;

/**
 * An anonymous visitor: no profile, no scopes. That is the whole access rule.
 * `listPosts` filters with `canReadPost(config, authData)` after querying and
 * `canSeeGroupFilter` falls through to `groupFilters.publiclyReadable()`, so
 * reusing those guards — instead of writing a sitemap-specific visibility check —
 * means any later change to what anonymous visitors may read applies here
 * automatically. Soft-deleted documents are excluded by the map layer.
 */
const ANONYMOUS: AuthorizationData = { scopes: [] };

const byNewest = (a: CrawlableEntry, b: CrawlableEntry) =>
  (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');

/** Collapse whitespace and clip to something a search snippet can use. */
const excerpt = (value: string | undefined, fallback: string): string => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 155 ? `${text.slice(0, 152).trimEnd()}...` : text;
};

/** Publicly readable pages, newest first. Events are posts and have no route of
 *  their own, so they are covered by the post paths.
 *
 *  Profiles are opt-in: a crawled profile page is cached by search engines long
 *  after the member leaves. `listProfiles` applies no privacy filter — it is the
 *  same list `/members` shows — so enabling this exposes exactly the profiles an
 *  anonymous visitor can already browse.
 */
export const crawlableEntries = async ({
  indexProfiles,
}: {
  indexProfiles: boolean;
}): Promise<CrawlableEntry[]> => {
  const [posts, groups, profiles] = await Promise.all([
    listPosts(ANONYMOUS, { limit: PER_KIND_LIMIT }),
    listGroups(ANONYMOUS),
    indexProfiles ? listProfiles() : Promise.resolve([]),
  ]);

  const entities = [
    ...posts.map((post) => ({
      path: `/posts/${post.id}`,
      updatedAt: post.updatedAt,
    })),
    ...groups.slice(0, PER_KIND_LIMIT).map((group) => ({
      path: `/groups/@${group.handle}`,
      updatedAt: group.updatedAt,
    })),
    ...profiles.slice(0, PER_KIND_LIMIT).map((profile) => ({
      path: `/@${profile.handle}`,
      updatedAt: profile.updatedAt,
    })),
  ].sort(byNewest);
  // A crawler arriving only through the sitemap otherwise never learns the
  // homepage exists; no lastmod, the root has no single modification time.
  return [{ path: '/' }, ...entities];
};

const resolveMeta = async (
  pathname: string,
  indexProfiles: boolean,
): Promise<SpaMeta> => {
  const route = seoRoute(pathname, { indexProfiles });
  if (!route) return { meta: null, notFound: false };

  if (route.kind === 'post') {
    const post = await findPost(route.handle);
    // findPost has no visibility gate of its own — `toFilteredPostsList` applies
    // it for lists — so the read rule is re-applied here rather than trusted.
    if (
      !post ||
      !(await canReadPost(await capabilitiesConfig(), ANONYMOUS)(post))
    )
      return { meta: null, notFound: true };
    const body =
      'content' in post.data
        ? post.data.content
        : 'name' in post.data
          ? post.data.name
          : '';
    const heading =
      'title' in post.data && post.data.title
        ? post.data.title
        : excerpt(body, post.profile?.displayName ?? 'Post');
    return {
      meta: {
        title: heading,
        description: excerpt(body, heading),
        kind: 'post',
        datePublished: post.createdAt,
        dateModified: post.updatedAt,
        authorName:
          post.profile?.displayName ||
          (post.profile?.handle ? `@${post.profile.handle}` : undefined),
      },
      notFound: false,
    };
  }

  if (route.kind === 'group') {
    const group = await findGroupByHandle(route.handle);
    // Groups have no visibility column; this mirrors
    // `groupFilters.publiclyReadable()`, which reads the same capability.
    if (!group?.capabilities?.none?.add?.includes('core-groups-read'))
      return { meta: null, notFound: true };
    const groupTitle = group.displayName || `@${group.handle}`;
    return {
      meta: {
        title: groupTitle,
        description: excerpt(group.description, groupTitle),
      },
      notFound: false,
    };
  }

  const profile = await findProfileByHandle(route.handle);
  if (!profile) return { meta: null, notFound: true };
  return {
    meta: {
      title: profile.displayName || `@${profile.handle}`,
      description: excerpt(profile.bio, `@${profile.handle}`),
    },
    notFound: false,
  };
};

/**
 * Metadata for a content route, plus whether it can render at all, so a shared
 * post is not described to every crawler as the community homepage and an
 * unknown id is not served as a 200. Negatives are cached as well: a bot
 * probing unknown ids should not turn each request into a query. Profile
 * metadata additionally requires the `indexProfiles` flag.
 */
export const spaMetaForPath = async (
  pathname: string,
  { indexProfiles }: { indexProfiles: boolean },
): Promise<SpaMeta> => {
  const redis = await getSharedConnection();
  const key = `${META_CACHE_PREFIX}${pathname}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as SpaMeta;

  const resolved = await resolveMeta(pathname, indexProfiles);
  await redis.set(key, JSON.stringify(resolved), { EX: META_TTL_SECONDS });
  return resolved;
};

/** Convenience wrapper for callers that only need the metadata itself. */
export const metaForPath = async (
  pathname: string,
  options: { indexProfiles: boolean },
): Promise<CrawlableMeta | null> =>
  (await spaMetaForPath(pathname, options)).meta;
