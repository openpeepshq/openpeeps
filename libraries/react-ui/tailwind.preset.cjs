/**
 * @openpeepshq/react-ui Tailwind preset.
 *
 * Bridges Skeleton-style CSS variables (--color-primary-500 as "R G B" channels)
 * with shadcn semantic tokens (background/foreground/etc).
 *
 * Usage in a consumer tailwind.config.cjs:
 *   module.exports = {
 *     presets: [require('@openpeepshq/react-ui/tailwind-preset')],
 *     content: [
 *       './src/**\/*.{ts,tsx}',
 *       './node_modules/@openpeepshq/react-ui/dist/**\/*.{js,mjs}',
 *     ],
 *   };
 */
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

const palette = (key) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => [
      shade,
      channel(`--color-${key}-${shade}`),
    ]),
  );

const onColor = (name) => channel(`--on-${name}`);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="OpenpeepsDark"]'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          ...palette('primary'),
          DEFAULT: channel('--color-primary-500'),
          foreground: onColor('primary'),
        },
        secondary: {
          ...palette('secondary'),
          DEFAULT: channel('--color-secondary-500'),
          foreground: onColor('secondary'),
        },
        tertiary: {
          ...palette('tertiary'),
          DEFAULT: channel('--color-tertiary-500'),
          foreground: onColor('tertiary'),
        },
        success: {
          ...palette('success'),
          DEFAULT: channel('--color-success-500'),
          foreground: onColor('success'),
        },
        warning: {
          ...palette('warning'),
          DEFAULT: channel('--color-warning-500'),
          foreground: onColor('warning'),
        },
        error: {
          ...palette('error'),
          DEFAULT: channel('--color-error-500'),
          foreground: onColor('error'),
        },
        surface: {
          ...palette('surface'),
          DEFAULT: channel('--color-surface-500'),
          foreground: onColor('surface'),
        },
        background: channel('--color-surface-50'),
        foreground: channel('--theme-font-color-base'),
        border: channel('--color-surface-300'),
        input: channel('--color-surface-200'),
        ring: channel('--color-primary-500'),
        muted: {
          DEFAULT: channel('--color-surface-100'),
          foreground: channel('--color-surface-700'),
        },
        accent: {
          DEFAULT: channel('--color-surface-100'),
          foreground: channel('--theme-font-color-base'),
        },
        popover: {
          DEFAULT: channel('--color-surface-50'),
          foreground: channel('--theme-font-color-base'),
        },
        card: {
          DEFAULT: channel('--color-surface-50'),
          foreground: channel('--theme-font-color-base'),
        },
        destructive: {
          DEFAULT: channel('--color-error-500'),
          foreground: onColor('error'),
        },
      },
      borderRadius: {
        lg: 'var(--theme-rounded-container, 0.5rem)',
        md: 'calc(var(--theme-rounded-container, 0.5rem) - 2px)',
        sm: 'calc(var(--theme-rounded-container, 0.5rem) - 4px)',
        full: 'var(--theme-rounded-base, 9999px)',
      },
      fontFamily: {
        sans: 'var(--theme-font-family-base, system-ui)',
        heading: 'var(--theme-font-family-heading, system-ui)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        spin: 'spin 1s linear infinite',
      },
      spacing: {
        70: '17.5rem',
        128: '32rem',
      },
    },
  },
  plugins: [],
};
