import type { Article, Profile, Role } from '@openpeepshq/common/types';
import {
  canUseInstanceScopedSlug,
  isHandleShapedSlug,
} from '@openpeepshq/common/lib';

/**
 * Capability gate for *instance-scoped* article slugs (globally unique
 * `/{slug}` routes), shared with the editor UI so both sides agree on who
 * may claim one. Capability-based (not role-key-based) so the `owner` role —
 * and any custom role granted `core-posts-slug-instance` in the admin
 * capability matrix — is honored. The default grant lives in
 * `roleDefaults` (owner via `*`, admin/moderator explicitly). This is also
 * the server-side containment so the permission model cannot be bypassed by
 * writing `instanceScoped: true` straight into the post body through the core
 * endpoints (which parse the extended `articleSchema`).
 */
const hasInstanceScopedRole = (
  profile: Profile & { roles?: Role[] },
): boolean => canUseInstanceScopedSlug(profile.roles ?? []);

/**
 * Enforce the slug permission model on an article body at write time:
 *
 * - `instanceScoped` is dropped unless the caller holds an
 *   instance-scoped role, so a normal member can never claim a
 *   globally-unique `/{slug}` route.
 * - A *handle-shaped* slug is dropped when the effective scope is
 *   instance-scoped: an `/{slug}` route of that shape is owned by the
 *   web router's `/:handle` route, so it would never resolve. Profile-scoped
 *   slugs keep their second `/{handle}` segment and resolve fine.
 *
 * Returns the (possibly stripped) data. Stripping rather than throwing keeps
 * the post saveable when the plugin (or a stale client) sends a field the
 * caller may not use; the uniqueness indexes remain the data-consistency
 * backstop.
 */
export const applyArticleSlugPolicy = (
  data: Article,
  profile: Profile & { roles?: Role[] },
): Article => {
  if (!data.slug) return data;

  const next: Article = { ...data };
  // Instance scope is role-gated; a member's `instanceScoped: true` is dropped.
  const instanceScoped =
    data.instanceScoped === true && hasInstanceScopedRole(profile);
  next.instanceScoped = instanceScoped ? true : undefined;
  // A *handle-shaped* slug is only dropped when the effective scope is
  // instance-scoped: an `/{slug}` route of that shape collides with the
  // web router's `/:handle` route and could never resolve. A profile-scoped
  // `/{handle}/{slug}` has a second segment, so it resolves fine and is kept.
  if (instanceScoped && isHandleShapedSlug(next.slug!)) delete next.slug;
  return next;
};
