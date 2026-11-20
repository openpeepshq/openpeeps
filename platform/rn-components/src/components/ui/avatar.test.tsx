/**
 * Regression tests for `ui/avatar`'s paint-over guarantee (issue #1666,
 * round-20 review item 2).
 *
 * The avatar underlays (ProfileAvatar / GroupAvatar initials tiles) rely on a
 * *loaded* image covering them: `AvatarImage` must keep a full-size base
 * `className` (`aspect-square h-full w-full`, merged with any passed
 * `className` via the real `cn`/twMerge) and forward `style` to the primitive
 * image. A regression that drops the size classes or `style` renders a loaded
 * image at zero size — leaving only the underlay visible — which silently
 * reintroduces the exact reported symptom. These tests fail on that.
 *
 * `./svg-image` is mocked to a marker so the SVG branch is deterministic
 * (the real `SvgImage` only paints after an async file read); the size
 * `className` under test is computed in `avatar.tsx` and asserted on the prop
 * it passes down. The real `isSvgUrl` (Jest source convention) decides the
 * SVG-vs-raster branch.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const MockPrimitiveImage = (props: {
  source?: unknown;
  className?: string;
  style?: unknown;
}) =>
  React.createElement('PrimitiveImage', {
    source: props.source,
    className: props.className,
    style: props.style,
  });
const MockSvgImage = (props: {
  uri?: string;
  className?: string;
  resizeMode?: string;
}) =>
  React.createElement('SvgImage', {
    uri: props.uri,
    className: props.className,
    resizeMode: props.resizeMode,
  });

jest.mock('react-native', () => ({ View: 'view', Image: 'image' }));
jest.mock('@rn-primitives/avatar', () => ({
  Root: 'avatar-root',
  Image: MockPrimitiveImage,
  Fallback: 'avatar-fallback',
}));
jest.mock('../../hooks/use-cached-media-uri', () => ({
  useCachedMediaUri: (uri?: string) =>
    uri ? `file:///cache/${uri}` : undefined,
  isLocalMediaUri: () => false,
}));
jest.mock('./svg-image', () => ({ SvgImage: MockSvgImage }));

// Real merge semantics: the real lib/utils drags in @openpeepshq/common (ESM
// dist) via its import graph, so recreate cn exactly (clsx + twMerge) here.
// That is what the assertions exercise — that the full-size base classes
// survive the real twMerge with the passed className.
const { clsx } = require('clsx');
const { twMerge } = require('tailwind-merge');
jest.mock('../../lib/utils', () => ({
  cn: (...inputs: Array<string | undefined>) => twMerge(clsx(inputs)),
}));

// Real URL helper (mapped through the repo's Jest source convention for
// `@openpeepshq/react`) — the SVG-vs-raster branch is part of what is pinned.
jest.mock('@openpeepshq/react', () => ({
  isSvgUrl: require('../../../../react/src/lib/svgCover').isSvgUrl,
}));

const { AvatarImage } = require('./avatar');

const renderImage = (props: {
  source?: unknown;
  className?: string;
  style?: unknown;
}) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(AvatarImage, props));
  });
  return tree;
};

describe('ui/avatar AvatarImage size/style pass-through (issue #1666 round-20 #2)', () => {
  it('keeps the full-size base classes, merges the passed className, and forwards style (raster branch)', () => {
    const tree = renderImage({
      source: { uri: 'https://cdn.example/avatars/x.png' },
      className: 'rounded-full',
      style: { width: 40, height: 40 },
    });
    const image = tree.root.findByType('PrimitiveImage');
    // The cached URI (useCachedMediaUri) is what a loaded image renders with.
    expect(image.props.source).toEqual({
      uri: 'file:///cache/https://cdn.example/avatars/x.png',
    });
    // style must reach the primitive image (dropping it regresses the underlay
    // paint-over to a zero-size overlay).
    expect(image.props.style).toEqual({ width: 40, height: 40 });
    // The full-size base classes survive the real cn/twMerge merge with the
    // passed className — nothing size-related is dropped.
    expect(image.props.className).toContain('h-full');
    expect(image.props.className).toContain('w-full');
    expect(image.props.className).toContain('rounded-full');
    expect(tree.root.findAllByType('SvgImage')).toHaveLength(0);
  });

  it('keeps the full-size base classes and merges the passed className (SVG branch)', () => {
    const tree = renderImage({
      source: { uri: 'https://cdn.example/avatars/x.svg' },
      className: 'rounded-full',
    });
    const svgImage = tree.root.findByType('SvgImage');
    expect(svgImage.props.uri).toBe('https://cdn.example/avatars/x.svg');
    expect(svgImage.props.resizeMode).toBe('cover');
    expect(svgImage.props.className).toContain('h-full');
    expect(svgImage.props.className).toContain('w-full');
    expect(svgImage.props.className).toContain('rounded-full');
    expect(tree.root.findAllByType('PrimitiveImage')).toHaveLength(0);
  });
});
