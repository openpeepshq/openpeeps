import { hexToRgbChannels, hexWithOpacity } from './color';
import { mapColors } from './defaults';
import type { OpenPeepsTheme } from './types';

// The pure color math lives in `./color` (nativewind-free) so tests can
// import the real implementation. Re-exported here for existing importers.
export { hexToRgbChannels, hexWithOpacity };

// `vars` is required lazily: nativewind's import chain crashes at import
// time in a plain node jest env (no Appearance module), and this module is
// reached through the provider's import graph. getThemeVars only runs in a
// real runtime where the provider renders.
const getVars = (): (typeof import('nativewind'))['vars'] =>
  require('nativewind').vars;

export const getThemeVars = (
  colors: OpenPeepsTheme['colors'],
  radii?: { buttonRadius?: string; radius?: string }
) =>
  getVars()({
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
