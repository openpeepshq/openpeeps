/**
 * Regression test for the native `ReactionPicker` orphaned-reaction path
 * (issue #276, round-5 review item #2) — the mirror of the web picker test.
 * Orphans — reactions attached before the community removed the emoji from its
 * allowed set — render after a divider, flagged `orphan` (dimmed by
 * `ReactionButton`), and stay retractable; there is no divider/orphan section
 * when every attached reaction is still allowed.
 *
 * The RN primitives, i18n, and `ReactionButton` are stubbed to self-describing
 * host tags (`RB_ALLOWED` / `RB_ORPHAN` / `DIVIDER`) so the assertions read the
 * real picker's orphan computation and render order from the rendered tree.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => {
  const V = (props: { className?: string; children?: unknown }) =>
    React.createElement(
      props.className === 'mx-1 h-8 w-px shrink-0 bg-border'
        ? 'DIVIDER'
        : 'DIV',
      null,
      props.children
    );
  const T = (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children);
  const P = (props: { children?: unknown }) =>
    React.createElement('Pressable', null, props.children);
  return { View: V, Text: T, Pressable: P };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('./ReactionButton', () => ({
  ReactionButton: (props: {
    reaction?: string;
    orphan?: boolean;
    onPress?: () => void;
  }) =>
    React.createElement(
      props.orphan ? 'RB_ORPHAN' : 'RB_ALLOWED',
      { onPress: props.onPress },
      props.reaction
    ),
}));

const { ReactionPicker } = require('./ReactionPicker');

const render = (
  myReactions: string[],
  reactions: readonly string[],
  onToggle: (reaction: string) => void
) => {
  let tree!: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ReactionPicker, {
        myReactions,
        reactions,
        onToggle,
      })
    );
  });
  return tree;
};

describe('ReactionPicker (native) orphans', () => {
  it('renders the orphan (dimmed flag) after the divider', () => {
    const tree = render(['🐰'], ['👍'], () => {});
    const dividers = tree.root.findAllByType('DIVIDER');
    const orphans = tree.root.findAllByType('RB_ORPHAN');
    expect(dividers.length).toBe(1);
    expect(orphans.length).toBe(1);
    // The divider precedes the orphan in render order.
    const all = tree.root.findAll(() => true);
    const dividerIdx = all.findIndex((n) => n.type === 'DIVIDER');
    const orphanIdx = all.findIndex((n) => n.type === 'RB_ORPHAN');
    expect(dividerIdx).toBeGreaterThanOrEqual(0);
    expect(dividerIdx).toBeLessThan(orphanIdx);
    // The orphan row carries the emoji it retracts.
    expect(orphans[0].children).toContain('🐰');
  });

  it('retracts when the orphan is tapped', () => {
    let toggled: string | undefined;
    const tree = render(['👍', '🐰'], ['👍'], (r) => {
      toggled = r;
    });
    const orphan = tree.root.findAllByType('RB_ORPHAN')[0];
    expect(orphan.children).toContain('🐰');
    // The orphan button is wired to retract its own emoji.
    ReactTestRenderer.act(() => {
      orphan.props.onPress();
    });
    expect(toggled).toBe('🐰');
  });

  it('renders no orphan section when every attached reaction is allowed', () => {
    const tree = render(['👍', '🎉'], ['👍', '🎉'], () => {});
    expect(tree.root.findAllByType('RB_ORPHAN').length).toBe(0);
    expect(tree.root.findAllByType('DIVIDER').length).toBe(0);
  });
});
