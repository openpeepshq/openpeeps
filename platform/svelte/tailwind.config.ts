import containerQueries from '@tailwindcss/container-queries';
import { join } from 'path';
import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { OpenpeepsLight } from './src/lib/theme/OpenpeepsLight.js';
import { OpenpeepsDark } from './src/lib/theme/OpenpeepsDark.js';

export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {
			spacing: {
				'70': '17.5rem',
				'128': '32rem'
			}
		}
	},
	plugins: [
		forms,
		typography,
		skeleton({
			themes: {
				custom: [OpenpeepsLight, OpenpeepsDark]
			}
		}),
		containerQueries
	]
} satisfies Config;
