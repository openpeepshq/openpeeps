import { Endpoint, z } from 'sveltekit-api';
import { i18nComplete, i18nOverrides, i18nWithPlugins } from '@openpeeps/core/i18n';
import { i18nResourceSchema } from '@openpeeps/common';

export const Output = z.object({
  defaults: i18nResourceSchema,
  merged: i18nResourceSchema,
  overrides: i18nResourceSchema,
});

export default new Endpoint({ Output }).handle(async () => ({
  defaults: await i18nWithPlugins(),
  merged: await i18nComplete(),
  overrides: await i18nOverrides(),
}));

