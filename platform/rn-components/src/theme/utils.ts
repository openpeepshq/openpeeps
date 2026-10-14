import { vars } from 'nativewind';
import { mapColors } from './defaults';
import type { OpenPeepsTheme } from './types';

/** Convert a hex color (#rrggbb) to "R G B" channel string for CSS `rgb()` usage. */
const hexToRgbChannels = (hex: string): string => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return hex;
  const [, r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return hex;
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
};

export const getThemeVars = (
  colors: OpenPeepsTheme['colors'],
  radii?: { buttonRadius?: string; radius?: string }
) =>
  vars({
    // CSS custom properties consumed by Tailwind `channel()` classes need
    // "R G B" channel format so `rgb(var(--x) / <alpha-value>)` resolves.
    // The `colors` object keeps hex strings for direct RN style usage.
    ...Object.fromEntries(
      Object.entries(colors).map(([key, value]) => [
        `--${key}`,
        hexToRgbChannels(value),
      ])
    ),
    '--theme-rounded-base': radii?.buttonRadius || '9999px',
    '--theme-rounded-container': radii?.radius || '0.5rem',
  });

export const buildTheme = (
  isDark: boolean,
  primaryColor: string | undefined,
  refresh: () => void | Promise<void>
) => {
  const colors = mapColors(isDark);
  return {
    isDark,
    colors: {
      ...colors,
      primary: primaryColor || colors.primary,
    },
    refresh,
  };
};
