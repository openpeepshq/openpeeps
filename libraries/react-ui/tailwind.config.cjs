/**
 * Local tailwind config used by `vite build` to generate the bundled CSS
 * exported as `@openpeepshq/react-ui/styles.css`.
 *
 * Consumers of the package should NOT use this file directly; they should
 * instead extend `tailwind.preset.cjs` from their own tailwind config.
 */
module.exports = {
  presets: [require('./tailwind.preset.cjs')],
  content: ['./src/**/*.{ts,tsx,css}'],
};
