import { join } from 'path';
import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { OpenpeepsLight } from '@openpeeps/svelte/theme';
import { OpenpeepsDark } from '@openpeeps/svelte/theme';

export default {
  darkMode: 'selector',
  content: [
    './src/**/*.{html,js,svelte,ts}',
    join(
      require.resolve('@skeletonlabs/skeleton'),
      '../**/*.{html,js,svelte,ts}',
    ),
    join(require.resolve('@openpeeps/svelte'), '../**/*.{html,js,svelte,ts}'),
    join(require.resolve('@openpeeps/ui'), '../../**/*.{html,js,svelte,ts}'),
  ],
  theme: {
    extend: {
      spacing: {
        '70': '17.5rem',
        '128': '32rem',
      },
    },
  },
  plugins: [
    forms,
    typography,
    skeleton({
      themes: {
        custom: [OpenpeepsLight, OpenpeepsDark],
      },
    }),
  ],
} satisfies Config;
