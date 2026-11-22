import { z } from '#lib/endpoint';
import { badRequest } from '#lib/errors';

/**
 * Trim, dedupe and bound the admin `content.allowedReactions` patch in place.
 * Rejects an over-long emoji (rather than silently dropping it) — like the
 * >64 list cap, silent data loss on a public endpoint is worse than a loud 400
 * the caller can act on.
 */
export const normalizeAllowedReactions = (config: unknown) => {
  if (!config || typeof config !== 'object') return;
  const content = (config as { content?: { allowedReactions?: unknown } })
    .content;
  if (!content || content.allowedReactions === undefined) return;
  const parsed = z.array(z.string()).safeParse(content.allowedReactions);
  if (!parsed.success) {
    throw badRequest('Post reactions must be a list of emojis');
  }
  if (parsed.data.some((emoji) => emoji.trim().length > 32)) {
    throw badRequest('Post reactions must each be at most 32 characters');
  }
  const cleaned = [
    ...new Set(
      parsed.data
        .map((emoji) => emoji.trim())
        .filter((emoji) => emoji.length > 0),
    ),
  ];
  if (cleaned.length > 64) {
    throw badRequest('Post reactions must contain at most 64 emojis');
  }
  content.allowedReactions = cleaned;
};
