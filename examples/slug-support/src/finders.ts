import { sql } from 'drizzle-orm';

import {
  isHandleShapedSlug,
  isValidArticleSlug,
} from '@openpeepshq/common/lib';
import { allpeepDb } from '@openpeepshq/core/db';
import { findPostBySlug } from '@openpeepshq/core/posts';
import { findProfile } from '@openpeepshq/core/profiles';
import type { SlugSupportConfig } from './configSchema.js';

/**
 * Slug shape and length live in `@openpeepshq/common/lib` (single source of
 * truth, shared with the data schema, SEO routes, and core write path). This
 * module re-checks them with the plugin's *configured* `maxSlugLength` so an
 * operator can tighten the cap below the platform default.
 */

/**
 * Normalize arbitrary text into a slug: lowercase, transliterate
 * non-ASCII, collapse runs of non-alphanumerics to a single hyphen, trim
 * hyphens, cap at `max`.
 */
export const slugify = (input: string, max: number): string =>
  input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);

export const isValidSlug = (slug: string, max: number): boolean =>
  isValidArticleSlug(slug) && slug.length <= max;

/** Instance-scoped slugs must not collide with the `/:handle` route. */
export const isInstanceSlugAllowed = (slug: string): boolean =>
  !isHandleShapedSlug(slug);

/** Drop a leading `@` and surrounding whitespace from a profile handle. */
export const stripHandle = (value: string): string =>
  value.replace(/^@/, '').trim();

/** Role keys held by a profile, via the `has_role` edge (same tables the
 * core authorization queries use). Raw SQL because the plugin import-depth
 * rule only allows one subpath segment and the schema tables are exported
 * two levels deep (`@openpeepshq/core/db/pg/schema`). */
export const findProfileRoleKeys = async (
  profileId: string,
): Promise<string[]> => {
  const { db } = await allpeepDb();
  const result = await db.execute(
    sql`select r.key as key from has_role hr
       inner join roles r on r.id::text = hr.to_id
      where hr.from_id = ${profileId}`,
  );
  return (result.rows ?? []).map((row) => String(row.key));
};

/** Whether the profile's roles allow requesting an instance-scoped slug. */
export const canUseInstanceScoped = async (
  profileId: string | undefined,
  config: SlugSupportConfig,
): Promise<boolean> => {
  if (!config.allowInstanceScoped || !profileId) return false;
  const roleKeys = await findProfileRoleKeys(profileId);
  return config.instanceScopedRoles.some((role) => roleKeys.includes(role));
};

/**
 * Whether a slug is already taken in the given scope. Reuses the core
 * `findPostBySlug` so the resolution rules (scope predicate, handle
 * resolution, uniqueness) match the SEO routes exactly.
 */
export const isSlugTaken = async (
  slug: string,
  handle: string | undefined,
  instanceScoped: boolean,
): Promise<boolean> => {
  if (instanceScoped && !isInstanceSlugAllowed(slug)) return true;
  const post = await findPostBySlug(
    slug,
    instanceScoped ? undefined : handle ? stripHandle(handle) : undefined,
    instanceScoped,
  );
  return post !== null;
};

/**
 * Generate an available slug from a title. Tries the bare slug first, then
 * appends `-2`, `-3`, ... until the scope is free (bounded so a pathological
 * title cannot loop forever).
 */
export const generateSlug = async (
  title: string,
  max: number,
  handle: string | undefined,
  instanceScoped: boolean,
): Promise<string | null> => {
  const base = slugify(title, max);
  if (!base) return null;
  if (instanceScoped && !isInstanceSlugAllowed(base)) return null;
  for (let i = 1; i <= 100; i++) {
    const candidate =
      i === 1
        ? base
        : `${base.slice(0, Math.max(1, max - String(i).length - 1))}-${i}`;
    if (!isValidSlug(candidate, max)) return null;
    if (!(await isSlugTaken(candidate, handle, instanceScoped)))
      return candidate;
  }
  return null;
};

/** The caller's own profile handle (for profile-scoped resolution). */
export const handleForProfileId = async (
  profileId: string | undefined,
): Promise<string | undefined> => {
  if (!profileId) return undefined;
  const profile = await findProfile(profileId);
  return profile?.handle;
};
