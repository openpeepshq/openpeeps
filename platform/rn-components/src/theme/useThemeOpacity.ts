import { useOpenPeepsTheme } from './OpenPeepsThemeProvider';
import { hexWithOpacity } from './color';
import type { ColorName } from './types';

/**
 * Inline-style opacity helper for theme colors.
 *
 * NativeWind v4 cannot apply a `/N` opacity modifier to a CSS-variable color
 * (`--primary` and friends), so a class like `bg-primary/10` resolves to no
 * color at all. Every such call site must build the rgba value inline from
 * the hex theme color instead — this hook is the single place that does it,
 * so the workaround (and any future fix) lives in one spot.
 */
export const useThemeOpacity = () => {
  const { colors } = useOpenPeepsTheme();
  return {
    /** `background` style for a token at the given opacity (0..1). */
    background: (name: ColorName, opacity: number) => ({
      backgroundColor: hexWithOpacity(colors[name], opacity),
    }),
    /** `borderColor` style for a token at the given opacity (0..1). */
    border: (name: ColorName, opacity: number) => ({
      borderColor: hexWithOpacity(colors[name], opacity),
    }),
    /** `color` style for a token at the given opacity (0..1). */
    text: (name: ColorName, opacity: number) => ({
      color: hexWithOpacity(colors[name], opacity),
    }),
  };
};
