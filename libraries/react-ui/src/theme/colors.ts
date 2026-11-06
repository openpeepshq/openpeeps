// Color helpers for theme overrides (flat primary/secondary tokens).

type Rgb = { r: number; g: number; b: number };

export const hexToRgb = (hex: string): Rgb | null => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return null;
  const [, r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return null;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
};

export const hexToTailwindRgbString = (hex: string): string => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return '(invalid)';
  const [, r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return '(invalid)';
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
};

export const getLuminance = (rgb: Rgb): number => {
  const a = [rgb.r, rgb.g, rgb.b].map((vRaw) => {
    const v = vRaw / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return (a[0] ?? 0) * 0.2126 + (a[1] ?? 0) * 0.7152 + (a[2] ?? 0) * 0.0722;
};

/** WCAG contrast ratio, or null when either color is not a 6-digit hex. */
export const contrastRatio = (hexA: string, hexB: string): number | null => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const lighter = Math.max(getLuminance(a), getLuminance(b));
  const darker = Math.min(getLuminance(a), getLuminance(b));
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Page backgrounds from `globals.css` (`--color-background`). Highlight colors
 * are drawn on top of these, so contrast checks use the same values.
 */
export const themeBackgroundHex = {
  light: '#ffffff',
  dark: '#09090b',
} as const;

export const generateA11yOnColor = (hex: string): '255 255 255' | '0 0 0' => {
  const onBlack = contrastRatio(hex, '#000000') ?? 0;
  const onWhite = contrastRatio(hex, '#FFFFFF') ?? 0;
  return onBlack > onWhite ? '0 0 0' : '255 255 255';
};
