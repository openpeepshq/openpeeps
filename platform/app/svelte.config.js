import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import sectionize from 'remark-sectionize';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.svx'],
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [
    vitePreprocess(),
    mdsvex({
      layout: './src/lib/components/docs/Layout.svelte',
      remarkPlugins: [sectionize],
    }),
  ],
  compilerOptions: {
    runes: true,
    warningFilter: (w) =>
      !['a11y_media_has_caption', 'svelte_component_deprecated'].includes(
        w.code,
      ),
  },
  vitePlugin: {
    dynamicCompileOptions({ filename }) {
      if (
        filename.includes('node_modules') ||
        filename.includes('src/routes/docs')
      ) {
        return { runes: undefined };
      }
    },
    inspector: true,
  },
  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      $api: './src/api',
    },
    csrf: {
      checkOrigin: false,
    },
  },
};
export default config;
