import { Endpoint, z } from 'sveltekit-api';
import { communityConfig } from '@openpeeps/core/config';

export const Output = z.any();

export default new Endpoint({ Output }).handle((_, event) =>
  communityConfig().then((config) => ({
    name: config.info.name,
    short_name: config.info.name,
    id: '/',
    icons: [
      {
        src: 'mobile-icons/128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'mobile-icons/152x152.png',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        src: 'mobile-icons/167x167.png',
        sizes: '167x167',
        type: 'image/png',
      },
      {
        src: 'mobile-icons/180x180.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: 'mobile-icons/192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'mobile-icons/256x256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: 'mobile-icons/512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    start_url: event.url.origin,
    display: 'standalone',
    theme_color: config?.theme?.primaryHex || '#000000',
    prefer_related_applications: false,
  })),
);
