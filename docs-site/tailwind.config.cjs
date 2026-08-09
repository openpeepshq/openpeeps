const typography = require('@tailwindcss/typography');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@openpeeps/react-ui/tailwind-preset')],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@openpeeps/react-ui/dist/**/*.{js,mjs}',
  ],
  plugins: [typography],
};
