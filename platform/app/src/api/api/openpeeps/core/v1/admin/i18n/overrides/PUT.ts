import { Endpoint, z } from 'sveltekit-api';
import { notFound } from '$lib/server/api/errors';
import { updateI18nOverrides } from '@openpeeps/core/i18n';
import { i18nResourceSchema, successResponseSchema } from '@openpeeps/common';
import { ensureRoleCapabilities } from '$lib/server/auth';

export const Output = successResponseSchema;
export const Input = z
  .object({
    en: z.any(),
  })
  .openapi({ type: 'object' });

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(async (input, event) => {
  await ensureRoleCapabilities(event, ['core-i18n-update']);
  console.log(input);
  console.log(i18nResourceSchema.safeParse(input));
  await updateI18nOverrides(input);
  return { success: true };
});

