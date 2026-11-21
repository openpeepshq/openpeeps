import { endpoint, z } from '#lib/endpoint';
import {
  collectAdditionalForbiddenHandles,
  communityProfileAdditionalFieldSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { forbidden, notFound, badRequest } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { updateConfigValues } from '@openpeepshq/core/config';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});
export const Input = z.object({
  config: z.any(),
});

export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
  404: notFound(),
};

const normalizeAdditionalForbiddenHandles = (config: unknown) => {
  if (!config || typeof config !== 'object') return;
  const settings = (
    config as { settings?: { additionalForbiddenHandles?: unknown } }
  ).settings;
  if (!settings || settings.additionalForbiddenHandles === undefined) return;
  const parsed = z
    .array(z.string())
    .safeParse(settings.additionalForbiddenHandles);
  if (!parsed.success) {
    throw badRequest('Forbidden usernames must be a list of strings');
  }
  const { handles, issues } = collectAdditionalForbiddenHandles(parsed.data);
  if (issues.length) {
    throw badRequest(
      'Forbidden usernames must be 1–16 letters, numbers, underscores, or hyphens',
    );
  }
  settings.additionalForbiddenHandles = handles;
};

const rejectEmptyProfileFieldKeys = (config: unknown) => {
  if (!config || typeof config !== 'object') return;
  const fields = (config as { profiles?: { additionalFields?: unknown } })
    .profiles?.additionalFields;
  if (fields === undefined) return;
  const parsed = z
    .array(communityProfileAdditionalFieldSchema)
    .safeParse(fields);
  if (!parsed.success) {
    throw badRequest('Profile field keys must be non-empty');
  }
};

export const normalizeAllowedReactions = (config: unknown) => {
  if (!config || typeof config !== 'object') return;
  const content = (config as { content?: { allowedReactions?: unknown } })
    .content;
  if (!content || content.allowedReactions === undefined) return;
  const parsed = z.array(z.string()).safeParse(content.allowedReactions);
  if (!parsed.success) {
    throw badRequest('Post reactions must be a list of emojis');
  }
  // Reject an over-long emoji rather than silently dropping it: like the
  // >64 list cap below, silent data loss on a public endpoint is worse than
  // a loud 400 the caller can act on.
  if (parsed.data.some((emoji) => emoji.trim().length > 32)) {
    throw badRequest('Post reactions must each be at most 32 characters');
  }
  // Trim, drop empties, dedupe, and bound the list size.
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

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    const { config, name, namespace } = input;
    rejectEmptyProfileFieldKeys(config);
    normalizeAdditionalForbiddenHandles(config);
    normalizeAllowedReactions(config);
    // Admin UI/CLI send sparse patches (e.g. only info.tagLine). Merge into the
    // stored overrides so unrelated keys like theme are preserved.
    await updateConfigValues(config, namespace, name);
    return { success: true };
  },
);
