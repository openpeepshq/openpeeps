import { endpoint, z } from '#lib/endpoint';
import { i18nComplete } from '@openpeeps/core/i18n';

export const Output = z.string().array();

export const apiEndpoint = endpoint({ Output }).handle(async () => {
  const resources = await i18nComplete();

  return Object.keys(resources);
});
