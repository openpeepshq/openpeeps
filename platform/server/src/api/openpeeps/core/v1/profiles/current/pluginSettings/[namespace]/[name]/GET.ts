import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import {
  forbidden,
  rethrowIfOpenpeepsError,
  unprocessableRequest,
} from '#lib/errors';
import { pluginSettingsResponseSchema } from '@openpeepshq/common/types';
import { findPluginSettings } from '@openpeepshq/core/profileSettings';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});
export const Output = pluginSettingsResponseSchema;

export const Error = {
  403: forbidden(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    return findPluginSettings(profile.id, input.namespace, input.name).catch(
      rethrowIfOpenpeepsError,
    );
  },
);
