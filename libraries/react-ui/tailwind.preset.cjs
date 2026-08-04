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
        // primary/secondary/success no longer have a Skeleton-style ramp —
        // DEFAULT+foreground are Figma's flat tokens, and the numeric
        // shades had zero remaining call sites so the ramp was deleted from
        // globals.css. tertiary/error/warning keep their 50-900 ramp
        // (channel(`--color-{key}-{shade}`)): tertiary has no Figma
        // equivalent at all, error is a deliberately-kept-separate legacy
        // family from destructive, and warning still has live numeric call
        // sites (e.g. bg-warning-900) alongside its Figma-sourced DEFAULT.
        primary: {
          DEFAULT: channel('--color-primary'),
          foreground: channel('--color-primary-foreground'),
        },
        secondary: {
          DEFAULT: channel('--color-secondary'),
          foreground: channel('--color-secondary-foreground'),
        },
        tertiary: {
          ...palette('tertiary'),
          DEFAULT: channel('--color-tertiary-500'),
          foreground: onColor('tertiary'),
        },
        success: {
          DEFAULT: channel('--color-success'),
          foreground: onColor('success'),
        },
        warning: {
          ...palette('warning'),
          DEFAULT: channel('--color-warning'),
          foreground: onColor('warning'),
        },
        error: {
          ...palette('error'),
          DEFAULT: channel('--color-error-500'),
          foreground: onColor('error'),
        },
        background: channel('--color-background'),
        foreground: channel('--color-foreground'),
        border: channel('--color-border-1'),
        'border-2': channel('--color-border-2'),
        input: channel('--color-input'),
        ring: channel('--color-ring'),
        'ring-offset': channel('--color-ring-offset'),
        text: channel('--color-text'),
        muted: {
          DEFAULT: channel('--color-muted'),
          foreground: channel('--color-muted-foreground'),
        },
        accent: {
          DEFAULT: channel('--color-muted'),
          foreground: channel('--color-accent-foreground'),
        },
        popover: {
          DEFAULT: channel('--color-popover'),
          foreground: channel('--color-popover-foreground'),
        },
        card: {
          DEFAULT: channel('--color-card'),
          foreground: channel('--color-card-foreground'),
        },
        destructive: {
          DEFAULT: channel('--color-destructive'),
          foreground: channel('--color-destructive-foreground'),
        },
        'primary-surface': channel('--color-primary-surface'),
        'modal-backdrop': 'var(--color-modal-backdrop)',
        progress: channel('--color-progress'),
        'surface-2': channel('--color-surface-2'),
        'surface-warning': channel('--color-surface-warning'),
        'surface-success': channel('--color-surface-success'),
        'surface-progress': channel('--color-surface-progress'),
        chart: {
          1: channel('--color-chart-1'),
          2: channel('--color-chart-2'),
          3: channel('--color-chart-3'),
          4: channel('--color-chart-4'),
          5: channel('--color-chart-5'),
        },
        sidebar: {
          background: channel('--color-sidebar-background'),
          foreground: channel('--color-sidebar-foreground'),
          primary: channel('--color-sidebar-primary'),
          'primary-foreground': channel('--color-sidebar-primary-foreground'),
          accent: channel('--color-sidebar-accent'),
          'accent-foreground': channel('--color-sidebar-accent-foreground'),
          border: channel('--color-sidebar-border'),
          ring: channel('--color-sidebar-ring'),
        },
        alpha: {
          10: 'var(--color-alpha-10)',
          20: 'var(--color-alpha-20)',
          30: 'var(--color-alpha-30)',
          40: 'var(--color-alpha-40)',
          50: 'var(--color-alpha-50)',
          60: 'var(--color-alpha-60)',
          70: 'var(--color-alpha-70)',
          80: 'var(--color-alpha-80)',
          90: 'var(--color-alpha-90)',
        },
      },
      // Tailwind's stock config hardcodes `borderColor.DEFAULT` to
      // `colors.gray.200` regardless of the `colors` theme (see
      // tailwindcss/stubs/config.full.js) — Preflight's `*,::before,::after`
      // reset uses this directly, so bare `border`/`border-b`/etc. utilities
      // rendered a static light gray in both themes instead of following
      // --color-border-1. Overriding it here (divideColor inherits the fix
      // since it's defined as `theme('borderColor')`).
      borderColor: {
        DEFAULT: channel('--color-border-1'),
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
