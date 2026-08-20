import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { badRequest, forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { uninstallPlugin } from '@openpeepshq/core/plugins';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    const profile = await ensureRoleCapabilities(event, [
      'core-plugins-manage',
    ]);
    const result = await uninstallPlugin(
      `${input.namespace}/${input.name}`,
      profile.handle ?? profile.id,
    );
    if (!result.success) {
      throw badRequest(result.error);
    }
    return { success: true };
  },
);
