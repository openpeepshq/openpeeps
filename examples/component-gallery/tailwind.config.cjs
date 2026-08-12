/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@openpeepshq/react-ui/tailwind-preset')],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Dev aliases compile these packages from source — scan them for classes.
    '../../libraries/react-ui/src/**/*.{ts,tsx}',
    '../../platform/react/src/**/*.{ts,tsx}',
    './node_modules/@openpeepshq/react-ui/dist/**/*.{js,mjs}',
    './node_modules/@openpeepshq/react/dist/**/*.{js,mjs}',
  ],
};
