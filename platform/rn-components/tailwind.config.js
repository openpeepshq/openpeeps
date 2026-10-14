const { hairlineWidth } = require('nativewind/theme');

/** `channel()` pattern: `rgb(var(--name) / <alpha-value>)` so `/N` opacity
 * modifiers (e.g. `bg-primary/10`) work on native. Requires CSS variables to
 * be in "R G B" channel format (see global.css / theme/utils.ts). */
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  // NOTE: Update this to include the paths to all of your component files.
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // Host apps should also include this package in their Tailwind `content` if they consume prebuilt output only.
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'border': channel('--border'),
        'input': channel('--input'),
        'ring': channel('--ring'),
        'background': channel('--background'),
        'foreground': channel('--foreground'),
        'primary': {
          DEFAULT: channel('--primary'),
          foreground: channel('--primary-foreground'),
        },
        'secondary': {
          DEFAULT: channel('--secondary'),
          foreground: channel('--secondary-foreground'),
        },
        'destructive': {
          DEFAULT: channel('--destructive'),
          foreground: channel('--destructive-foreground'),
        },
        'muted': {
          DEFAULT: channel('--muted'),
          foreground: channel('--muted-foreground'),
        },
        'accent': {
          DEFAULT: channel('--accent'),
          foreground: channel('--accent-foreground'),
        },
        'popover': {
          DEFAULT: channel('--popover'),
          foreground: channel('--popover-foreground'),
        },
        'card': {
          DEFAULT: channel('--card'),
          foreground: channel('--card-foreground'),
        },
        // `surface` mirrors `muted` (same token on the web preset).
        'surface': {
          DEFAULT: channel('--muted'),
          foreground: channel('--muted-foreground'),
        },
        'surface-2': channel('--surface-2'),
        'alpha': channel('--alpha'),
      },
      // Override Tailwind's default `borderColor.DEFAULT` so bare `border`/`border-b`
      // utilities follow the theme border color instead of a static gray.
      borderColor: {
        DEFAULT: channel('--border'),
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      borderRadius: {
        button: 'var(--theme-rounded-base)',
        lg: 'var(--theme-rounded-container, 0.5rem)',
        md: 'calc(var(--theme-rounded-container, 0.5rem) - 2px)',
        sm: 'calc(var(--theme-rounded-container, 0.5rem) - 4px)',
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
        'spin': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'spin': 'spin 1s linear infinite',
      },
      spacing: {
        70: '17.5rem',
        128: '32rem',
      },
    },
  },
  plugins: [
    // Constrain iframes rendered inside markdown prose so they can't
    // break through scroll/overflow boundaries (Safari doesn't clip iframes
    // via overflow:hidden alone).
    function ({ addComponents }) {
      addComponents({
        '.allpeep-markdown iframe': {
          maxWidth: '100% !important',
          width: '100% !important',
          border: '0',
          display: 'block',
        },
        '.allpeep-markdown iframe[style]': {
          // Override inline styles set by markdown source so iframes
          // can never exceed the container bounds.
          maxWidth: '100% !important',
          width: '100% !important',
        },
      });
    },
  ],
};
