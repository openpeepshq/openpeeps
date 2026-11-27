import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import { forbidden } from '#lib/errors';
import { findPostBySlug } from '@openpeepshq/core/posts';
import {
  canUseInstanceScopedSlug,
  generateArticleSlug,
  isHandleShapedSlug,
} from '@openpeepshq/common/lib';

export const Input = z.object({
  title: z.string().min(1),
  instanceScoped: z.boolean().optional(),
  /** On the edit form, the article being edited: its own current slug is
   *  not a collision. */
  excludePostId: z.uuid().optional(),
});

/**
 * `slug: null` means generation found nothing free (or the title slugifies
 * to nothing) — not a permission problem. Permission failures still fail
 * with 403, so the client can distinguish the two cases.
 */
export const Output = z.object({ slug: z.string().nullable() });

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    const instanceScoped = input.instanceScoped === true;
    if (instanceScoped && !canUseInstanceScopedSlug(profile.roles)) {
      throw forbidden(
        'Instance-scoped slugs require the instance-slug permission',
      );
    }
    const isTaken = (slug: string) =>
      findPostBySlug(
        slug,
        instanceScoped ? undefined : profile.handle,
        instanceScoped,
        input.excludePostId,
      ).then((post) => post !== null);
    const slug = await generateArticleSlug(input.title, isTaken);
    // A handle-shaped result can never be a resolvable instance-scoped
    // `/{slug}` (it collides with `/:handle`), so generation yields nothing.
    if (!slug || (instanceScoped && isHandleShapedSlug(slug))) {
      return { slug: null };
    }
    return { slug };
  },
);
