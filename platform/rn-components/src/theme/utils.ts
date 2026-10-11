import { vars } from 'nativewind';
import { mapColors } from './defaults';
import type { OpenPeepsTheme } from './types';

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
