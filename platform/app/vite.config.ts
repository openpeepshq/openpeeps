import { sentrySvelteKit } from "@sentry/sveltekit";
import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sentrySvelteKit({
    sourceMapsUploadOptions: {
      org: "allpeep",
      project: "ap-at",
      url: "https://sentry.allpeep-hq.com/"
    }
  }), sveltekit(), purgeCss()],
  server: {
    fs: {
      allow: ['../..'],
    },
  },
  build: {
    minify: false,
  },
});