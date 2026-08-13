import { generateA11yOnColor, hexToTailwindRgbString } from './colors';
import { resolveThemeFontCss } from './fonts';

export type ThemeOverrides = {
  primaryHex: string;
  secondaryHex?: string;
  fontFamily?: string;
  buttonRadius?: string;
  radius?: string;
  background?: string;
};

/** Flat semantic token used by the Figma-aligned Tailwind preset (`bg-primary`). */
const flatColorVars = (name: string, hex: string): string => {
  const rgb = hexToTailwindRgbString(hex);
  if (rgb === '(invalid)') return '';
  const on = generateA11yOnColor(hex.startsWith('#') ? hex : `#${hex}`);
  return `--color-${name}: ${rgb};\n\t--color-${name}-foreground: ${on};\n\t`;
};

/**
 * Build a `<style>` tag that applies community theme overrides for the active
 * data-theme. Sets flat `--color-primary` / `--color-secondary` (Figma tokens)
 * and optional font / radius CSS variables. Does not generate Skeleton-style
 * 50–900 ramps.
 */
export const applyThemeOverrides = (
  baseTheme: string,
  overrides: ThemeOverrides,
): string => {
  const {
    primaryHex,
    secondaryHex,
    fontFamily,
    buttonRadius,
    radius,
    background = '',
  } = overrides;

  const fontCss = resolveThemeFontCss(fontFamily);

  const vars = [
    flatColorVars('primary', primaryHex),
    secondaryHex ? flatColorVars('secondary', secondaryHex) : '',
    fontCss
      ? `--theme-font-family-base: ${fontCss};\n\t--theme-font-family-heading: ${fontCss};\n\t`
      : '',
    buttonRadius ? `--theme-rounded-base: ${buttonRadius};\n\t` : '',
    radius ? `--theme-rounded-container: ${radius};\n\t` : '',
  ].join('');

  const bgRule = background
    ? `background-image: url(${background});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;`
    : '';

  return `<style>
:root, [data-theme='${baseTheme}'] {
${vars}
}
body {
  scrollbar-color: rgb(var(--color-primary) / 0.5) transparent;
  ${bgRule}
}
</style>`;
};

/**
 * @deprecated Prefer {@link applyThemeOverrides}. Kept for callers that only
 * pass primary + background.
 */
export const themeStyleString = (
  baseTheme: string,
  primaryHex: string,
  background: string,
): string => applyThemeOverrides(baseTheme, { primaryHex, background });

/** Set the theme by writing the data-theme attribute on the body. */
export const setTheme = (baseTheme: string): void => {
  if (typeof document === 'undefined') return;
  document.body?.setAttribute('data-theme', baseTheme);
};
