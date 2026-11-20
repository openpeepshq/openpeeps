/**
 * Tests for the shared unread-count pill (issue #2106 — badge clips
 * 3-digit counts and the ∞ glyph in a fixed 20px RN pill).
 *
 * Pins the geometry contract the fix relies on: the pill grows via native
 * `minWidth` (no fixed `width`), the label is single-line, and the label
 * string comes from the real `formatBadgeCount` (∞ past 99) so the
 * regression the issue reports cannot come back silently.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => {
  const el =
    (tag: string) =>
    (props: Record<string, unknown> & { children?: unknown }) =>
      React.createElement(tag, props, props.children);
  return { View: el('View'), Text: el('Text') };
});

jest.mock('./themed-text', () => ({
  ThemedText: (props: Record<string, unknown> & { children?: unknown }) =>
    React.createElement('ThemedText', props, props.children),
  TextClassContext: {
    Provider: ({ children }: { children?: unknown }) => children,
  },
}));

jest.mock('../../lib/utils', () => ({
  cn: (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' '),
}));

// The jest moduleNameMapper pins the `@openpeepshq/common` root to a single
// module that does not export `formatBadgeCount` — load the real source
// directly, since the ∞-past-99 threshold is exactly what this issue pins.
jest.mock('@openpeepshq/common', () => ({
  formatBadgeCount: require('../../../../common/src/lib/text').formatBadgeCount,
}));

import { UnreadBadge } from './unread-badge';

type TreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: (string | TreeNode)[];
};

const walk = (node: TreeNode): TreeNode[] => [
  node,
  ...(node.children ?? [])
    .filter((child): child is TreeNode => typeof child !== 'string')
    .flatMap((child) => walk(child)),
];

const render = (ui: React.ReactNode): TreeNode | null => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(ui);
  });
  return tree.toJSON() as unknown as TreeNode | null;
};

describe('UnreadBadge', () => {
  test('renders the count up to 99', () => {
    const root = render(<UnreadBadge count={99} />);
    expect(root).not.toBeNull();
    const texts = walk(root!).filter((n) => n.type === 'ThemedText');
    expect(texts).toHaveLength(1);
    expect(texts[0].children).toContain('99');
  });

  test.each([100, 102, 9999])('renders ∞ for count %i', (count) => {
    const root = render(<UnreadBadge count={count} />);
    expect(root).not.toBeNull();
    const texts = walk(root!).filter((n) => n.type === 'ThemedText');
    expect(texts).toHaveLength(1);
    expect(texts[0].children).toContain('∞');
  });

  test.each([0, -5])('renders nothing for count %i', (count) => {
    const root = render(<UnreadBadge count={count} />);
    expect(root).toBeNull();
  });

  test('pill grows via minWidth and never carries a fixed width', () => {
    const root = render(<UnreadBadge count={100} />);
    expect(root).not.toBeNull();
    // The pill is the root View here (single node with a style prop).
    const pill = walk(root!).find((n) => n.type === 'View' && n.props?.style);
    expect(pill).toBeDefined();
    const style = pill!.props!.style as Record<string, unknown>;
    expect(style.minWidth).toBe(20);
    expect(style.height).toBe(20);
    expect(style).not.toHaveProperty('width');
    expect(String(pill!.props!.className)).toContain('bg-destructive');
    expect(String(pill!.props!.className)).toContain('rounded-full');
  });

  test('label is single-line and passes through extra className', () => {
    const root = render(<UnreadBadge count={5} className="shrink-0" />);
    expect(root).not.toBeNull();
    const label = walk(root!).find((n) => n.type === 'ThemedText');
    expect(label).toBeDefined();
    expect(label!.props?.numberOfLines).toBe(1);
    expect(String(label!.props?.className)).toContain(
      'text-destructive-foreground'
    );
    const pill = walk(root!).find((n) => n.type === 'View' && n.props?.style);
    expect(String(pill!.props!.className)).toContain('shrink-0');
  });
});
