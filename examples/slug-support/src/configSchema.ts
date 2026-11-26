import { z } from '@openpeepshq/common/zod';

export const slugSupportConfigSchema = () =>
  z.object({
    /** Master switch; when false the plugin exposes no routes or UI. */
    enabled: z.boolean().default(true),
    /** Upper bound for a slug; matches `ARTICLE_SLUG_MAX_LENGTH`. */
    maxSlugLength: z.number().int().min(1).max(100).default(100),
    /** Offer the auto-generate control in the editor. */
    autoGenerate: z.boolean().default(true),
    /** Allow admins/moderators to request a global `/{slug}` URL. */
    allowInstanceScoped: z.boolean().default(true),
    /** Role keys that may request an instance-scoped (global) slug. */
    instanceScopedRoles: z.array(z.string()).default(['admin', 'moderator']),
  });

export type SlugSupportConfig = z.infer<
  ReturnType<typeof slugSupportConfigSchema>
>;
