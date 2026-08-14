import { describe, expect, it } from 'vitest';
import { isSvgUrl, svgCoverSrc } from '../svgCover';

describe('isSvgUrl', () => {
  it('matches svg paths and query strings', () => {
    expect(isSvgUrl('/img/logo.svg')).toBe(true);
    expect(isSvgUrl('/storage/abc/logo.SVG?cache=1')).toBe(true);
    expect(isSvgUrl('/img/logo.png')).toBe(false);
  });

  it('matches svg data urls', () => {
    expect(isSvgUrl('data:image/svg+xml;utf8,<svg></svg>')).toBe(true);
  });
});

describe('svgCoverSrc', () => {
  it('appends a cover fragment to svg urls', () => {
    expect(svgCoverSrc('/img/logo.svg')).toBe(
      '/img/logo.svg#svgView(preserveAspectRatio(xMidYMid slice))',
    );
  });

  it('keeps query strings and replaces an existing hash', () => {
    expect(svgCoverSrc('/storage/a/logo.svg?v=2#old')).toBe(
      '/storage/a/logo.svg?v=2#svgView(preserveAspectRatio(xMidYMid slice))',
    );
  });

  it('leaves raster urls and already-covered svgs unchanged', () => {
    expect(svgCoverSrc('/img/avatar.png')).toBe('/img/avatar.png');
    const covered =
      '/img/logo.svg#svgView(preserveAspectRatio(xMidYMid slice))';
    expect(svgCoverSrc(covered)).toBe(covered);
  });
});
