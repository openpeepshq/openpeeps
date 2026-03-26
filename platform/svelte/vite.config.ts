import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	optimizeDeps: {
		include: ['@openpeeps/common', '@openpeeps/ui', '@openpeeps/core', '@openpeeps/svelte']
	},
	ssr: {
		noExternal: ['@openpeeps/common', '@openpeeps/ui', '@openpeeps/core', '@openpeeps/svelte']
	}
});
