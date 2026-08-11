// Color helpers for theme overrides (flat primary/secondary tokens).

type Rgb = { r: number; g: number; b: number };

export const hexToRgb = (hex: string): Rgb | null => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return null;
  const [, r, g, b] = m;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
};

export const hexToTailwindRgbString = (hex: string): string => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return '(invalid)';
  const [, r, g, b] = m;
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
};

export const getLuminance = (rgb: Rgb): number => {
  const a = [rgb.r, rgb.g, rgb.b].map((vRaw) => {
    const v = vRaw / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const calculateRatio = (luminance1: string, luminance2: string): number => {
  const lum1 = getLuminance(hexToRgb(luminance1)!);
  const lum2 = getLuminance(hexToRgb(luminance2)!);
  return lum1 > lum2
    ? (lum2 + 0.05) / (lum1 + 0.05)
    : (lum1 + 0.05) / (lum2 + 0.05);
};

export const generateA11yOnColor = (hex: string): '255 255 255' | '0 0 0' => {
  const black = calculateRatio(hex, '#000000');
  const white = calculateRatio(hex, '#FFFFFF');
  return black < white ? '0 0 0' : '255 255 255';
};
