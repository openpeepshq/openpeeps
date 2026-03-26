import { Endpoint, z } from 'sveltekit-api';
import { i18nComplete } from '@openpeeps/core/i18n';

export const Output = z.string().array();

export default new Endpoint({ Output }).handle(async () => {
  const resources = await i18nComplete();

  return Object.keys(resources);
});
