const typography = require('@tailwindcss/typography');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@openpeepshq/react-ui/tailwind-preset')],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@openpeepshq/react-ui/dist/**/*.{js,mjs}',
  ],
  plugins: [typography],
};
