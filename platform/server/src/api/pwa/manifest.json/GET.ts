import { endpoint, z } from '#lib/endpoint';
import { buildPwaManifest } from '#lib/pwa';
import { communityConfig } from '@openpeepshq/core/config';

export const Output = z.any();

export const apiEndpoint = endpoint({ Output }).handle((_, event) =>
  communityConfig().then((config) =>
    buildPwaManifest(config, event.url.origin),
  ),
);
