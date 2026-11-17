/**
 * Pure color math shared by the app and its regression tests.
 *
 * Kept `nativewind`-free on purpose: `theme/utils.ts` imports `vars` from
 * `nativewind`, which cannot load in the node jest environment. Splitting the
 * color helpers into this dependency-free module lets the tests import and
 * exercise the *real* `hexWithOpacity` instead of a hand-rolled copy (a copy
 * would miss e.g. the `##` -> `#` normalization below).
 */

/** Convert a hex color (#rrggbb) to an "R G B" channel string. */
export const hexToRgbChannels = (hex: string): string => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return hex;
  const [, r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return hex;
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
};

/** Convert a hex color to an `rgba(r, g, b, a)` string. */
export const hexWithOpacity = (hex: string, opacity: number): string => {
  const sanitized = hex.replaceAll('##', '#');
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized);
  if (!m) return hex;
  const [, r, g, b] = m;
  if (r === undefined || g === undefined || b === undefined) return hex;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${opacity})`;
};
