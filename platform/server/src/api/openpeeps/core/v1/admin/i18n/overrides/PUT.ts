import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';
import { updateI18nOverrides } from '@openpeeps/core/i18n';
import { i18nResourceSchema, successResponseSchema } from '@openpeeps/common';
import { ensureRoleCapabilities } from '#lib/auth';

export const Output = successResponseSchema;
export const Input = z
  .object({
    en: z.any(),
  })
  .openapi({ type: 'object' });

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(async (input, event) => {
  await ensureRoleCapabilities(event, ['core-i18n-update']);
  console.log(input);
  console.log(i18nResourceSchema.safeParse(input));
  await updateI18nOverrides(input);
  return { success: true };
});

