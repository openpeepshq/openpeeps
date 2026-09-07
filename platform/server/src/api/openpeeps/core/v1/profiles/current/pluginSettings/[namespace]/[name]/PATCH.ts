import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import {
  conflict,
  forbidden,
  rethrowIfOpenpeepsError,
  unprocessableRequest,
} from '#lib/errors';
import {
  pluginSettingsRequestSchema,
  pluginSettingsResponseSchema,
} from '@openpeepshq/common/types';
import { updatePluginSettings } from '@openpeepshq/core/profileSettings';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});
export const Input = pluginSettingsRequestSchema;
export const Output = pluginSettingsResponseSchema;

export const Error = {
  403: forbidden(),
  409: conflict(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    return updatePluginSettings(
      profile.id,
      input.namespace,
      input.name,
      input,
    ).catch(rethrowIfOpenpeepsError);
  },
);
