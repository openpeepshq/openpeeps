import { endpoint, z } from '#lib/endpoint';
import {
  collectAdditionalForbiddenHandles,
  communityProfileAdditionalFieldSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { forbidden, notFound, badRequest } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { updateConfigValues } from '@openpeepshq/core/config';
import { getLocalProfileByHandle } from '@openpeepshq/core/profiles';

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

const validateAutoFollowHandles = async (config: unknown) => {
  if (!config || typeof config !== 'object') return;
  const autoFollow = (config as { content?: { autoFollow?: unknown } }).content
    ?.autoFollow;
  if (autoFollow === undefined) return;
  const parsed = z.array(z.string()).safeParse(autoFollow);
  if (!parsed.success) {
    throw badRequest('Auto-follow handles must be a list of strings');
  }
  const unresolved: string[] = [];
  for (const rawHandle of parsed.data) {
    const handle = rawHandle.replace(/^@/, '').trim();
    if (!handle) continue;
    if (!(await getLocalProfileByHandle(handle))) {
      unresolved.push(rawHandle);
    }
  }
  if (unresolved.length) {
    throw badRequest(`Unknown auto-follow handles: ${unresolved.join(', ')}`);
  }
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    const { config, name, namespace } = input;
    rejectEmptyProfileFieldKeys(config);
    normalizeAdditionalForbiddenHandles(config);
    await validateAutoFollowHandles(config);
    // Admin UI/CLI send sparse patches (e.g. only info.tagLine). Merge into the
    // stored overrides so unrelated keys like theme are preserved.
    await updateConfigValues(config, namespace, name);
    return { success: true };
  },
);
