/**
 * Contract for the RN `TruncatedMarkdown` (issue #2074): `maxLines` and the
 * sizing/color `className` are honored, not ignored.
 *
 * `maxLines` tightens the excerpt to a per-line char budget; `text-sm`/`text-xs`
 * map to text metrics and `text-foreground`/`text-muted-foreground` to theme
 * colors — all merged over the markdown theme (the base 16/24 `foreground`
 * previously applied regardless). A caller-provided `snippet` is re-truncated to
 * the same budget so it cannot exceed `maxLines`.
 *
 * The excerpt budget math runs through the REAL `truncateMarkdown` (the
 * `@openpeepshq/common/lib` barrel can't load under Jest's node runtime, so it
 * is re-exported here from the shared source) so the tests pin the
 * user-visible clamp — not just the shape of the call to the helper.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  StyleSheet: {
    flatten: (s: unknown) => (Array.isArray(s) ? Object.assign({}, ...s) : s),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../theme/OpenPeepsThemeProvider', () => ({
  useOpenPeepsTheme: () => ({
    colors: {
      'foreground': '#18181b',
      'muted-foreground': '#71717a',
    },
  }),
}));

jest.mock('@openpeepshq/common/lib', () => ({
  // Real implementation from the shared source (the built barrel is ESM and
  // can't be parsed under Jest's node transform).
  truncateMarkdown: require('../../../../common/src/lib/markdownHelpers')
    .truncateMarkdown,
}));

const mockMarkdownCalls: { source?: string; baseTextStyle?: unknown }[] = [];

jest.mock('../markdown', () => ({
  OpenpeepsMarkdown: (props: { source?: string; baseTextStyle?: unknown }) => {
    mockMarkdownCalls.push({
      source: props.source,
      baseTextStyle: props.baseTextStyle,
    });
    return React.createElement('MarkdownExcerpt', { source: props.source });
  },
}));

jest.mock('../markdown/MarkdownOverlay', () => ({
  MarkdownOverlay: ({ children }: { children?: unknown }) =>
    React.createElement('Overlay', null, children),
}));

import { TruncatedMarkdown } from './TruncatedMarkdown';

const render = (element: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

/** The excerpt actually handed to the markdown renderer (last render). */
const lastExcerpt = () => mockMarkdownCalls.at(-1)?.source ?? '';
/** The style override actually handed to the markdown renderer. */
const lastStyle = () => mockMarkdownCalls.at(-1)?.baseTextStyle;

const LONG = 'word '.repeat(30).trim(); // ~150 chars of short words

beforeEach(() => {
  mockMarkdownCalls.length = 0;
});

test('maxLines={1} bounds the rendered excerpt to the one-line char budget', () => {
  render(
    <TruncatedMarkdown
      source={LONG}
      maxBlocks={1}
      maxChars={80}
      maxLines={1}
      interactive={false}
      className="text-sm text-muted-foreground"
    />
  );
  // Budget = min(80, 1 * 40) = 40 → the real truncateMarkdown keeps the
  // excerpt within that (plus one char for the ellipsis it appends).
  expect(lastExcerpt().length).toBeLessThanOrEqual(41);
});

test('without maxLines the caller char budget applies and no override is set', () => {
  render(<TruncatedMarkdown source={LONG} maxBlocks={2} maxChars={240} />);
  // No maxLines → the full 240-char budget is used, not the per-line one.
  expect(lastExcerpt().length).toBeGreaterThan(41);
  expect(lastExcerpt().length).toBeLessThanOrEqual(241);
  expect(lastStyle()).toBeUndefined();
});

test('a caller snippet is re-truncated to the maxLines budget, not used raw', () => {
  const rawSnippet = 'snippet-word '.repeat(20).trim(); // ~240 chars, unbounded
  render(
    <TruncatedMarkdown
      source={LONG}
      snippet={rawSnippet}
      maxBlocks={1}
      maxChars={80}
      maxLines={1}
      interactive={false}
    />
  );
  // The 240-char snippet must be squeezed to the 40-char one-line budget.
  expect(lastExcerpt().length).toBeLessThanOrEqual(41);
});

test('a caller snippet without maxLines is used as-is, not re-truncated', () => {
  const rawSnippet = 'snippet-word '.repeat(20).trim(); // ~240 chars
  render(
    <TruncatedMarkdown
      source={LONG}
      snippet={rawSnippet}
      maxBlocks={1}
      maxChars={80}
      interactive={false}
    />
  );
  // No maxLines → no per-line budget: the caller snippet is trusted verbatim,
  // even though it far exceeds maxChars. Pinning this keeps any future
  // "always clamp" change a conscious decision, not a silent behavior flip.
  expect(lastExcerpt()).toBe(rawSnippet);
  expect(lastExcerpt().length).toBeGreaterThan(80);
});

test('text-sm + text-muted-foreground map to sm metrics and the muted color', () => {
  render(
    <TruncatedMarkdown
      source={LONG}
      maxChars={80}
      maxLines={1}
      interactive={false}
      className="text-sm text-muted-foreground"
    />
  );
  expect(lastStyle()).toEqual({
    fontSize: 14,
    lineHeight: 20,
    color: '#71717a',
  });
});

test('interactive excerpt keeps the overlay trigger around the sized excerpt', () => {
  const tree = render(
    <TruncatedMarkdown
      source={LONG}
      maxChars={80}
      maxLines={1}
      className="text-sm text-muted-foreground"
    />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Overlay');
  expect(json).toContain('MarkdownExcerpt');
  expect(lastStyle()).toEqual({
    fontSize: 14,
    lineHeight: 20,
    color: '#71717a',
  });
  ReactTestRenderer.act(() => tree.unmount());
});

test('protected inline links are kept whole, never severed by the budget', () => {
  const SHORT = '[ok](https://x.com)';
  const LONG_LINK =
    '[a long protected link label](https://example.com/some/very/long/url)';
  const source = `head ${SHORT} mid ${LONG_LINK}`;
  render(
    <TruncatedMarkdown
      source={source}
      maxBlocks={1}
      maxChars={80}
      maxLines={1}
      interactive={false}
    />
  );
  const excerpt = lastExcerpt();
  expect(excerpt.length).toBeLessThanOrEqual(41);
  // A protected span that fits in the remaining budget is kept whole…
  expect(excerpt).toContain(SHORT);
  // …and one that does not fit is omitted rather than severed mid-token.
  expect(excerpt).not.toContain('a long protected');
  expect(excerpt).not.toMatch(/\[[^\]]*$/); // no dangling `[label`
  expect(excerpt).not.toMatch(/\]\([^)]*$/); // no dangling `](url`
});
