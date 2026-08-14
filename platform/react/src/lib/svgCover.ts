/**
 * Browsers render `<img src="*.svg">` with SVG's default
 * `preserveAspectRatio="xMidYMid meet"` (contain), so `object-fit: cover`
 * does not fill a square avatar the way a PNG/JPEG/GIF does.
 *
 * The SVG View fragment switches that to `slice` (cover).
 * @see https://www.w3.org/TR/SVG11/linking.html#SVGFragmentIdentifiers
 */
const SVG_COVER_FRAGMENT = 'svgView(preserveAspectRatio(xMidYMid slice))';

export const isSvgUrl = (src: string): boolean =>
  /\.svg(?:$|[?#])/i.test(src) || /image\/svg\+xml/i.test(src);

export const svgCoverSrc = (src: string): string => {
  if (!isSvgUrl(src) || src.includes('#svgView')) {
    return src;
  }
  const hash = src.indexOf('#');
  const base = hash >= 0 ? src.slice(0, hash) : src;
  return `${base}#${SVG_COVER_FRAGMENT}`;
};
