import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { badRequest, forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { installPlugin } from '@openpeepshq/core/plugins';
import { reloadPlugins } from '#lib/pluginReload';

const installSourceSchema = z.union([
  z.object({
    type: z.literal('npm'),
    package: z.string().min(1),
    version: z.string().optional(),
  }),
  z.object({
    type: z.literal('git'),
    url: z.string().url(),
    ref: z.string().optional(),
  }),
]);

export const Input = installSourceSchema;

export const Output = successResponseSchema.extend({
  pluginKey: z.string().optional(),
});

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event) => {
    const profile = await ensureRoleCapabilities(event, [
      'core-plugins-manage',
    ]);
    const result = await installPlugin(input, profile.handle ?? profile.id);
    if (!result.success) {
      throw badRequest(result.error);
    }
    await reloadPlugins();
    return { success: true, pluginKey: result.pluginKey };
  },
);
