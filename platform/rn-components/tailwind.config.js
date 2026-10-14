const { hairlineWidth } = require('nativewind/theme');

/**
 * NOTE: NativeWind v4 does not resolve Tailwind's `<alpha-value>` token,
 * so the `rgb(var(--x) / <alpha-value>)` "channel()" pattern used on web
 * breaks ALL color classes on native. Colors use plain `var(--x)` references
 * instead. Opacity modifiers (`bg-primary/10`) are handled via inline styles
 * in the components that need them (see ConversationMessageBubble).
 */
export default {
  // NOTE: Update this to include the paths to all of your component files.
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // Host apps should also include this package in their Tailwind `content` if they consume prebuilt output only.
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'border': 'var(--border)',
        'input': 'var(--input)',
        'ring': 'var(--ring)',
        'background': 'var(--background)',
        'foreground': 'var(--foreground)',
        'primary': {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        'secondary': {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        'destructive': {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        'muted': {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        'accent': {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        'popover': {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        'card': {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        // `surface` mirrors `muted` (same token on the web preset).
        'surface': {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        'surface-2': 'var(--surface-2)',
        'alpha': 'var(--alpha)',
      },
      // Override Tailwind's default `borderColor.DEFAULT` so bare `border`/`border-b`
      // utilities follow the theme border color instead of a static gray.
      borderColor: {
        DEFAULT: 'var(--border)',
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
