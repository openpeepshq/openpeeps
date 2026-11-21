/**
 * Native ReactionPicker render test (issue #80 review round 4).
 *
 * Pins the picker contract on React Native, mirroring the web
 * ReactionPicker.test.tsx per the AGENTS.md sync rule: the row renders all 7
 * curated reactions plus the explicit close affordance, the current
 * profile's own reactions are highlighted, a tap calls `onToggle` with the
 * tapped emoji, and the close button fires `onClose`.
 *
 * Mirrors the inline-mock pattern of PostMenu.test.tsx / ShareMenu.test.tsx:
 * node jest env, every external import mocked; `@openpeepshq/common` is
 * stubbed with the real curated set so the row is asserted against the
 * actual REACTION_TYPES values.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

const REACTION_TYPES = ['👍', '👎', '❤️', '😂', '😮', '😢', '🎉'];
const CLOSE_LABEL = 'posts.actions.closeReactionPicker';

jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: ReactNode }) => {
    const { children, ...rest } = props;
    return React.createElement(tag, rest, children);
  };
  return {
    View: make('View'),
    Pressable: make('Pressable'),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('@openpeepshq/common', () => ({
  REACTION_TYPES,
}));

jest.mock('../../ui/themed-text', () => {
  const React = require('react');
  return {
    ThemedText: (props: { children?: ReactNode }) =>
      React.createElement('Text', null, props.children),
  };
});

jest.mock('../../icons/index', () => ({
  XIcon: () => null,
}));

jest.mock('../../../lib/utils', () => ({
  cn: (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(' '),
}));

import { ReactionPicker } from './ReactionPicker';

type TreeNode = {
  type?: string;
  props?: Record<string, unknown> | null;
  children?: (TreeNode | string | null)[];
};

function collectText(node: unknown, out: string[] = []): string[] {
  if (node === null || typeof node !== 'object') return out;
  const n = node as TreeNode;
  for (const c of n.children || []) {
    if (typeof c === 'string') out.push(c);
    else if (c) collectText(c, out);
  }
  return out;
}

/** Depth-first walk over the render tree, visiting every element node. */
function walk(node: unknown, visit: (n: TreeNode) => void): void {
  if (node === null || typeof node !== 'object') return;
  const n = node as TreeNode;
  visit(n);
  for (const c of n.children || []) {
    if (typeof c !== 'string' && c !== null) walk(c, visit);
  }
}

/** The Pressable whose only text content is the given emoji. */
function emojiPressable(json: unknown, emoji: string): TreeNode | undefined {
  let found: TreeNode | undefined;
  walk(json, (n) => {
    if (found || n.type !== 'Pressable') return;
    if (collectText(n).join('') === emoji) found = n;
  });
  return found;
}

const renderPicker = (props?: {
  myReactions?: string[];
  onToggle?: (reaction: string) => void;
  onClose?: () => void;
}) => {
  const onToggle = props?.onToggle ?? jest.fn();
  const onClose = props?.onClose ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ReactionPicker
        myReactions={props?.myReactions ?? []}
        onToggle={onToggle}
        onClose={onClose}
      />
    );
  });
  return { tree, onToggle, onClose };
};

test('renders every curated reaction plus the close affordance', () => {
  const { tree } = renderPicker();
  const text = collectText(tree.toJSON());
  for (const emoji of REACTION_TYPES) {
    expect(text).toContain(emoji);
  }
  let sawClose = false;
  walk(tree.toJSON(), (n) => {
    if (n.props?.accessibilityLabel === CLOSE_LABEL) sawClose = true;
  });
  expect(sawClose).toBe(true);
  tree.unmount();
});

test('highlights only the reactions the current profile already attached', () => {
  const { tree } = renderPicker({ myReactions: ['❤️'] });
  const highlighted: string[] = [];
  walk(tree.toJSON(), (n) => {
    const className = n.props?.className;
    if (typeof className === 'string' && className.includes('bg-border')) {
      highlighted.push(...collectText(n));
    }
  });
  expect(highlighted).toEqual(['❤️']);
  tree.unmount();
});

test('gives each emoji button an accessibility label with the reaction name', () => {
  const { tree } = renderPicker();
  for (const emoji of REACTION_TYPES) {
    const button = emojiPressable(tree.toJSON(), emoji);
    expect(button).toBeTruthy();
    expect(button?.props?.accessibilityLabel).toBe(emoji);
  }
  tree.unmount();
});

test('tapping an emoji calls onToggle with that emoji', () => {
  const onToggle = jest.fn();
  const { tree } = renderPicker({ onToggle });
  const pressed = emojiPressable(tree.toJSON(), '😂');
  expect(pressed).toBeTruthy();
  ReactTestRenderer.act(() => {
    (pressed?.props?.onPress as () => void)();
  });
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onToggle).toHaveBeenCalledWith('😂');
  tree.unmount();
});

test('the close button fires onClose without toggling a reaction', () => {
  const onToggle = jest.fn();
  const onClose = jest.fn();
  const { tree } = renderPicker({ onToggle, onClose });
  let closed = false;
  walk(tree.toJSON(), (n) => {
    if (n.props?.accessibilityLabel === CLOSE_LABEL && n.props?.onPress) {
      closed = true;
      ReactTestRenderer.act(() => (n.props.onPress as () => void)());
    }
  });
  expect(closed).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onToggle).not.toHaveBeenCalled();
  tree.unmount();
});
