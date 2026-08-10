import type { CommunityConfig } from '@openpeepshq/common/types';

/** "R G B" channel string → `#rrggbb` for email-safe inline styles. */
const channelToHex = (channels: string): string => {
  const [r, g, b] = channels.split(' ').map((c) => Number.parseInt(c, 10));
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r ?? 0)}${hex(g ?? 0)}${hex(b ?? 0)}`;
};

/**
 * OpenpeepsLight palette as concrete hex values. Email clients cannot resolve
 * the CSS-variable-based tokens the web app uses at runtime.
 */
const LIGHT_PALETTE = {
  primary: {
    50: '#e6f5f8',
    100: '#cdeaf0',
    200: '#b4e0e9',
    300: '#9bd5e1',
    400: '#78c5d5',
    500: '#55acba',
    600: '#448a95',
    700: '#336770',
    800: '#22454a',
    900: '#112225',
    DEFAULT: '#55acba',
    foreground: '#ffffff',
  },
  secondary: {
    DEFAULT: '#55acba',
    foreground: '#ffffff',
  },
  surface: {
    50: '#ffffff',
    100: '#f5f6f7',
    200: '#e9ebee',
    300: '#d3d7dc',
    400: '#9aa2ae',
    500: '#6d7786',
    600: '#545c68',
    700: '#3c424b',
    800: '#24272d',
    900: '#121416',
    DEFAULT: '#6d7786',
    foreground: '#000000',
  },
  success: {
    DEFAULT: '#22c55e',
    foreground: '#000000',
  },
  warning: {
    DEFAULT: '#f59e0b',
    foreground: '#000000',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    DEFAULT: '#ef4444',
    foreground: '#ffffff',
  },
  background: '#ffffff',
  foreground: channelToHex('0 0 0'),
  border: '#d3d7dc',
  input: '#e9ebee',
  ring: '#55acba',
  muted: {
    DEFAULT: '#f5f6f7',
    foreground: '#545c68',
  },
  accent: {
    DEFAULT: '#f5f6f7',
    foreground: channelToHex('0 0 0'),
  },
  card: {
    DEFAULT: '#ffffff',
    foreground: channelToHex('0 0 0'),
  },
  destructive: {
    DEFAULT: '#ef4444',
    foreground: '#ffffff',
  },
} as const;

/**
 * Tailwind config for `@react-email/components` `<Tailwind>`. Compiles utility
 * classes from feed post components into inline `style` attributes.
 */
export const buildEmailTailwindConfig = (
  communityConfig?: CommunityConfig,
) => {
  const primaryHex =
    communityConfig?.theme?.light?.primaryHex ??
    communityConfig?.theme?.primaryHex;

  const colors = primaryHex
    ? {
        ...LIGHT_PALETTE,
        primary: { ...LIGHT_PALETTE.primary, DEFAULT: primaryHex, 500: primaryHex },
        ring: primaryHex,
      }
    : LIGHT_PALETTE;

  return {
    theme: {
      extend: {
        colors,
        borderRadius: {
          lg: '0.5rem',
          md: 'calc(0.5rem - 2px)',
          sm: 'calc(0.5rem - 4px)',
          full: '9999px',
        },
        fontFamily: {
          sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        spacing: {
          70: '17.5rem',
          128: '32rem',
        },
      },
    },
  };
};
