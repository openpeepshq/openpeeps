/**
 * Contract test for the real (unmocked) useThemeOpacity hook (issue #1666
 * review S5).
 *
 * The picker-row tint tests in ProfileSelector.test.tsx assert against a
 * MOCKED useThemeOpacity whose values are copied from theme/defaults.ts. If
 * the real hook's signature or the token shape ever changes, that mock would
 * silently drift and the mocked tests would keep passing. This suite pins
 * the real hook directly: it must resolve `background(name, opacity)` to the
 * documented `rgba(...)` shape by feeding the token hex into the real
 * hexWithOpacity color math.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('./OpenPeepsThemeProvider', () => ({
  // Mirrors the context shape the real hook reads. Values come from
  // theme/defaults.ts (the default light theme) so the assertions are pinned
  // to the documented palette.
  useOpenPeepsTheme: () => ({
    colors: {
      primary: '#16161a',
      secondary: '#f4f4f5',
    },
  }),
}));

import { useThemeOpacity } from './useThemeOpacity';

const UseThemeOpacityProbe = () => {
  const opacity = useThemeOpacity();
  return React.createElement('useThemeOpacityProbe', {
    background: opacity.background,
    border: opacity.border,
    text: opacity.text,
  });
};

const renderProbe = () => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(UseThemeOpacityProbe));
  });
  return tree.root.findByType('useThemeOpacityProbe').props as {
    background: (name: string, opacity: number) => Record<string, unknown>;
    border: (name: string, opacity: number) => Record<string, unknown>;
    text: (name: string, opacity: number) => Record<string, unknown>;
  };
};

describe('useThemeOpacity (real hook, issue #1666 review S5)', () => {
  it('resolves background(primary, opacity) to the documented rgba shape', () => {
    const { background } = renderProbe();
    expect(background('primary', 0.15)).toEqual({
      backgroundColor: 'rgba(22, 22, 26, 0.15)',
    });
    expect(background('secondary', 0.4)).toEqual({
      backgroundColor: 'rgba(244, 244, 245, 0.4)',
    });
  });

  it('exposes border/text variants on the same hex', () => {
    const { border, text } = renderProbe();
    expect(border('primary', 0.5)).toEqual({
      borderColor: 'rgba(22, 22, 26, 0.5)',
    });
    expect(text('primary', 1)).toEqual({ color: 'rgba(22, 22, 26, 1)' });
  });
});
