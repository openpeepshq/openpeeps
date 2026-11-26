import type { PluginManifest } from '@openpeepshq/common';
import { routes } from './routes.js';
import { slugSupportConfigSchema } from './configSchema.js';

export { routes };

export const configSchema = {
  schema: slugSupportConfigSchema,
  defaults: {
    enabled: true,
    maxSlugLength: 100,
    autoGenerate: true,
    allowInstanceScoped: true,
    instanceScopedRoles: ['admin', 'moderator'],
  },
};

export const manifest: PluginManifest = {
  components: [
    {
      slot: 'plugins.articles.editor.slug',
      asset: 'web/articleSlugField.js',
      componentKey: 'examples/slug-support/article-slug-field',
    },
  ],
};
