/**
 * @openpeepshq/react-ui Tailwind preset.
 *
 * Bridges theme CSS variables (--color-* as "R G B" channels) with shadcn
 * semantic tokens (background/foreground/etc).
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
        // Flat Figma semantic tokens. tertiary/error are legacy flat anchors
        // (no Figma token for those families yet).
        primary: {
          DEFAULT: channel('--color-primary'),
          foreground: channel('--color-primary-foreground'),
        },
        secondary: {
          DEFAULT: channel('--color-secondary'),
          foreground: channel('--color-secondary-foreground'),
        },
        tertiary: {
          DEFAULT: channel('--color-tertiary'),
          foreground: onColor('tertiary'),
        },
        success: {
          DEFAULT: channel('--color-success'),
          foreground: onColor('success'),
        },
        warning: {
          DEFAULT: channel('--color-warning'),
          foreground: onColor('warning'),
        },
        error: {
          DEFAULT: channel('--color-error'),
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
          DEFAULT: channel('--color-surface'),
          foreground: channel('--color-muted-foreground'),
        },
        accent: {
          DEFAULT: channel('--color-surface'),
          foreground: channel('--color-accent-foreground'),
        },
        popover: {
          DEFAULT: channel('--color-popover'),
          foreground: channel('--color-popover-foreground'),
        },
        card: {
          DEFAULT: channel('--color-surface'),
          foreground: channel('--color-muted-foreground'),
        },
        destructive: {
          DEFAULT: channel('--color-destructive'),
          foreground: channel('--color-destructive-foreground'),
        },
        'modal-backdrop': 'var(--color-modal-backdrop)',
        progress: channel('--color-progress'),
        surface: {
          DEFAULT: channel('--color-surface'),
          foreground: channel('--color-muted-foreground'),
        },
        'surface-2': channel('--color-surface-2'),
        'surface-primary': channel('--color-surface-primary'),
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
        button: 'var(--theme-rounded-base, 9999px)',
        full: '9999px',
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
