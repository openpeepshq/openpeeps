// Ported verbatim from @openpeepshq/ui/theme/colors.ts.

export type Palette = {
  [key: number]: {
    hex: string;
    rgb: string;
    on: string;
  };
};

type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb | null {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return null;
  const [, r, g, b] = m;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}

export function hexToTailwindRgbString(hex: string): string {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return '(invalid)';
  const [, r, g, b] = m;
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => `0${c.toString(16)}`.slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getLuminance(rgb: Rgb): number {
  const a = [rgb.r, rgb.g, rgb.b].map((vRaw) => {
    const v = vRaw / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function lighten(hex: string, intensity: number): string {
  const color = hexToRgb(`#${hex}`);
  if (!color) return '';
  const r = Math.round(color.r + (255 - color.r) * intensity);
  const g = Math.round(color.g + (255 - color.g) * intensity);
  const b = Math.round(color.b + (255 - color.b) * intensity);
  return rgbToHex(r, g, b);
}

function darken(hex: string, intensity: number): string {
  const color = hexToRgb(hex);
  if (!color) return '';
  const r = Math.round(color.r * intensity);
  const g = Math.round(color.g * intensity);
  const b = Math.round(color.b * intensity);
  return rgbToHex(r, g, b);
}

function calculateRatio(luminance1: string, luminance2: string): number {
  const lum1 = getLuminance(hexToRgb(luminance1)!);
  const lum2 = getLuminance(hexToRgb(luminance2)!);
  return lum1 > lum2 ? (lum2 + 0.05) / (lum1 + 0.05) : (lum1 + 0.05) / (lum2 + 0.05);
}

export function generateA11yOnColor(hex: string): '255 255 255' | '0 0 0' {
  const black = calculateRatio(hex, '#000000');
  const white = calculateRatio(hex, '#FFFFFF');
  return black < white ? '0 0 0' : '255 255 255';
}

export function generatePalette(baseColor: string): Palette {
  const valid = /^#[0-9a-f]{6}$/i;
  const base = valid.test(baseColor) ? baseColor : '#CCCCCC';

  const hex500 = `#${base}`.replace('##', '#');
  const palette: Palette = {
    500: { hex: hex500, rgb: hexToTailwindRgbString(hex500), on: generateA11yOnColor(hex500) },
  };

  const intensityMap: Record<number, number> = {
    50: 0.85,
    100: 0.8,
    200: 0.75,
    300: 0.6,
    400: 0.3,
    600: 0.9,
    700: 0.75,
    800: 0.6,
    900: 0.49,
  };

  [50, 100, 200, 300, 400].forEach((level) => {
    const hex = lighten(base, intensityMap[level]);
    palette[level] = { hex, rgb: hexToTailwindRgbString(hex), on: generateA11yOnColor(hex) };
  });
  [600, 700, 800, 900].forEach((level) => {
    const hex = darken(base, intensityMap[level]);
    palette[level] = { hex, rgb: hexToTailwindRgbString(hex), on: generateA11yOnColor(hex) };
  });

  return palette;
}
