import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import { findPostBySlug } from '@openpeepshq/core/posts';
import {
  canUseInstanceScopedSlug,
  isHandleShapedSlug,
  isValidArticleSlug,
} from '@openpeepshq/common/lib';

export const Query = z.object({
  slug: z.string().min(1),
  /** `true` checks the global `/{slug}` scope; default is the caller's
   *  profile-scoped `/{handle}/{slug}` scope. */
  instanceScoped: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  /** On the edit form, the article being edited: its own current slug
   *  must not be reported as taken. */
  excludePostId: z.uuid().optional(),
});

export const Output = z.object({
  /** The slug is a valid shape and free in the requested scope. */
  available: z.boolean(),
  /** True when the slug is well-formed but the caller may not claim the
   *  requested scope (the scope radio is shown, with a permission note). */
  requiresPermission: z.boolean().optional(),
});

export const apiEndpoint = endpoint({ Query, Output }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    const slug = input.slug;
    const instanceScoped = input.instanceScoped === true;
    if (!isValidArticleSlug(slug)) {
      return { available: false };
    }
    if (instanceScoped) {
      // An instance-scoped `/{slug}` of handle shape is owned by the `/:handle`
      // route — it can never resolve, so it is reported as taken, not
      // permission-gated.
      if (isHandleShapedSlug(slug)) {
        return { available: false };
      }
      if (!canUseInstanceScopedSlug(profile.roles)) {
        return { available: false, requiresPermission: true };
      }
    }
    const taken = await findPostBySlug(
      slug,
      instanceScoped ? undefined : profile.handle,
      instanceScoped,
      input.excludePostId,
    );
    return { available: !taken };
  },
);
