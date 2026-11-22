/**
 * Contract for `markdownTheme` (issue #2074): the optional `baseTextStyle` is
 * merged over every text-bearing style (`body`, `paragraph`, `list`,
 * `listItem`) and nothing is altered when it is not provided. This is the one
 * function every markdown surface's text metrics flow through, so a silent
 * regression in the merge must be caught here directly (the component tests
 * mock `../markdown` and never exercise it).
 */

jest.mock('react-native', () => ({
  StyleSheet: {
    flatten: (s: unknown) => (Array.isArray(s) ? Object.assign({}, ...s) : s),
  },
}));

import { markdownTheme } from './theme';
import { mapColors } from '../../theme/defaults';

// Real light-theme defaults (nativewind-free), so the assertions check the
// hex values the app actually ships — a test with an invented color would
// keep passing if the real default drifted.
const colors = mapColors(false);

const TEXT_STYLES = ['body', 'paragraph', 'list', 'listItem'] as const;

test('without baseTextStyle the base 16/24 foreground text styles survive', () => {
  const theme = markdownTheme(colors);
  for (const name of TEXT_STYLES) {
    const style = theme[name] as Record<string, unknown>;
    // The real light default foreground (theme/defaults.ts), not a test-only hex.
    expect(style.color).toBe('#0a0a0b');
    // `body` carries only the color; the block styles carry the 16/24 metrics.
    if (name !== 'body') {
      expect(style.fontSize).toBe(16);
      expect(style.lineHeight).toBe(24);
    }
  }
});

test('baseTextStyle merges over every text-bearing style, keeping defaults', () => {
  const theme = markdownTheme(colors, {
    baseTextStyle: { fontSize: 14, lineHeight: 20, color: '#71717a' },
  });
  for (const name of TEXT_STYLES) {
    const style = theme[name] as Record<string, unknown>;
    expect(style).toMatchObject({
      fontSize: 14,
      lineHeight: 20,
      color: '#71717a',
    });
  }
});

test('a partial override only replaces the keys it provides', () => {
  const theme = markdownTheme(colors, {
    baseTextStyle: { fontSize: 12 },
  });
  for (const name of TEXT_STYLES) {
    const style = theme[name] as Record<string, unknown>;
    expect(style.fontSize).toBe(12);
    // lineHeight 24 and the real default foreground are untouched.
    if (name !== 'body') {
      expect(style.lineHeight).toBe(24);
    }
    expect(style.color).toBe(colors.foreground);
  }
});

test('non-text-bearing styles are left untouched by baseTextStyle', () => {
  const themed = markdownTheme(colors, {
    baseTextStyle: { fontSize: 14, color: '#71717a' },
  });
  const plain = markdownTheme(colors);
  expect(themed.link).toEqual(plain.link);
  expect(themed.blockquote).toEqual(plain.blockquote);
  expect(themed.code_inline).toEqual(plain.code_inline);
  expect(themed.heading1).toEqual(plain.heading1);
});
