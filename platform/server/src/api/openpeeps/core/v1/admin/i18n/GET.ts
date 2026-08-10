import { endpoint, z } from '#lib/endpoint';
import { i18nComplete, i18nOverrides, i18nWithPlugins } from '@openpeepshq/core/i18n';
import { i18nResourceSchema } from '@openpeepshq/common';

export const Output = z.object({
  defaults: i18nResourceSchema,
  merged: i18nResourceSchema,
  overrides: i18nResourceSchema,
});

export const apiEndpoint = endpoint({ Output }).handle(async () => ({
  defaults: await i18nWithPlugins(),
  merged: await i18nComplete(),
  overrides: await i18nOverrides(),
}));

