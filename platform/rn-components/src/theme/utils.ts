import { vars } from 'nativewind';
import { mapColors } from './defaults';
import type { OpenPeepsTheme } from './types';

/** Convert a hex color (#rrggbb) to "R G B" channel string for use in
 * `rgb()` expressions in inline styles (NativeWind doesn't support `/N`
 * opacity modifiers on CSS-variable colors). */
export const hexToRgbChannels = (hex: string): string => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return hex;
  const [, r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return hex;
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
};

/** Convert a hex color to an `rgba(r, g, b, a)` string for inline styles. */
export const hexWithOpacity = (hex: string, opacity: number): string => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return hex;
  const [, r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return hex;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${opacity})`;
};

export const getThemeVars = (
  colors: OpenPeepsTheme['colors'],
  radii?: { buttonRadius?: string; radius?: string }
) =>
  vars({
    ...Object.fromEntries(
      Object.entries(colors).map(([key, value]) => [`--${key}`, value])
    ),
    '--theme-rounded-base': radii?.buttonRadius || '9999px',
    '--theme-rounded-container': radii?.radius || '0.5rem',
  });

/** Parse a CSS dimension string (e.g. '9999px', '8px') into a React Native
 * numeric pixel value. Returns 0 when the string can't be parsed. */
export const parseDimension = (value: string): number => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

export const buildTheme = (
  isDark: boolean,
  primaryColor: string | undefined,
  buttonRadius: string | undefined,
  refresh: () => void | Promise<void>
) => {
  const colors = mapColors(isDark);
  return {
    isDark,
    colors: {
      ...colors,
      primary: primaryColor || colors.primary,
    },
    buttonRadius: buttonRadius || '9999px',
    refresh,
  };
};
