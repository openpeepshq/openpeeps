import { handleRegexBase } from '../types/forbiddenHandles';

/**
 * Single source of truth for the article-slug invariants.
 *
 * A slug is a clean, shareable URL segment for an article: 1–100 characters of
 * lowercase alphanumerics separated by single hyphens. Every layer that reads
 * or writes a slug — the data schema, the SEO route parser, the core write
 * path, and the `slug-support` example plugin — must agree on these exact
 * rules, so they live here and are imported everywhere instead of being
 * re-typed.
 *
 * Keep this in sync with the two partial unique indexes on `posts.body` in
 * `platform/core/src/db/pg/schema/documents.ts` (`posts_slug_instance_unique` /
 * `posts_slug_profile_unique`) — they pin the same shape per scope.
 */
export const ARTICLE_SLUG_MAX_LENGTH = 100;

/** `^[a-z0-9]+(?:-[a-z0-9]+)*$` — one or more lowercase-alnum runs, `-`-separated. */
export const articleSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A valid slug: non-empty, within the length cap, and matching the pattern.
 * A bare empty/whitespace-only string is never a slug.
 */
export const isValidArticleSlug = (slug: string): boolean =>
  slug.length > 0 &&
  slug.length <= ARTICLE_SLUG_MAX_LENGTH &&
  articleSlugPattern.test(slug);

/**
 * A value shaped like a profile handle: 1–16 chars of `[a-zA-Z0-9_-]` — the
 * same `handleRegexBase` the handle rules are built from, so a future change
 * to the handle shape keeps this guard in lockstep. The web router's
 * `/:handle` route owns every bare path segment of this shape, so an
 * *instance-scoped* slug must not be handle-shaped or it would collide with a
 * profile URL.
 */
export const isHandleShapedSlug = (value: string): boolean =>
  new RegExp(`^${handleRegexBase}$`).test(value);
