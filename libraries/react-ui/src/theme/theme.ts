import { generatePalette, type Palette } from './colors';

export const generateColorCSS = (colorKey: string, color: string): string => {
  const palette: Record<string, Palette> = { [colorKey]: generatePalette(color) };
  let css = `/* ${colorKey} | ${palette[colorKey][500].hex} */\n\t`;
  for (const [k, v] of Object.entries(palette[colorKey])) {
    css += `--color-${colorKey}-${k}: ${v.rgb}; /* ⬅ ${v.hex} */\n\t`;
  }
  return css;
};

export const themeStyleString = (
  baseTheme: string,
  primaryHex: string,
  background: string,
): string => `<style>
:root [data-theme='${baseTheme}']{
${generateColorCSS('primary', primaryHex)}
}
body {
  scrollbar-color: rgb(var(--color-primary-500) / 0.5) transparent;
  background-image: url(${background});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
body * { border-color: rgb(var(--color-surface-100)); }
</style>`;

/** Set the theme by writing the data-theme attribute on the body. */
export const setTheme = (baseTheme: string): void => {
  if (typeof document === 'undefined') return;
  document.body?.setAttribute('data-theme', baseTheme);
};
