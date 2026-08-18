import { endpoint, z } from '#lib/endpoint';
import {
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

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    const { config, name, namespace } = input;
    rejectEmptyProfileFieldKeys(config);
    // Admin UI/CLI send sparse patches (e.g. only info.tagLine). Merge into the
    // stored overrides so unrelated keys like theme are preserved.
    await updateConfigValues(config, namespace, name);
    return { success: true };
  },
);
