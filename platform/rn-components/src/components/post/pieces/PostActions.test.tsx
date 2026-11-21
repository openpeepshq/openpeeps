/**
 * Native PostActions reaction-picker wiring (issue #80 review round 5).
 *
 * Pins that the RN PostActions React button opens the picker and threads
 * `myReactions` / `toggleReaction` / `onClose` through to it (the web path has
 * useFeedPostActions + ReactionPicker tests, but the native wiring was
 * untested). Mirrors PostMenu.test.tsx: node jest env, every external import
 * mocked — the decision under test is the button→picker threading.
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';

const REACTION_TYPES = ['👍', '👎', '❤️', '😂', '😮', '😢', '🎉'];

// --- shared mutable state read by the module mocks (hoisting-safe) ---------
let toggleReaction: (reaction: string) => void | Promise<void> = jest.fn();
let toggleRepost: () => void | Promise<void> = jest.fn();
let reply: () => void = jest.fn();
const mockMyReactions: string[] = ['❤️'];
let mockCanReact = true;

let lastPickerProps:
  | {
      myReactions: string[];
      onToggle: (r: string) => void;
      onClose: () => void;
    }
  | undefined;
const buttonInstances: { onPress?: () => void }[] = [];

// --- react-native: host elements render as plain host tags ----------------
jest.mock('react-native', () => {
  const React = require('react');
  const make = (tag: string) => (props: { children?: ReactNode }) =>
    React.createElement(tag, props, props.children);
  return {
    View: make('View'),
    Pressable: make('Pressable'),
  };
});

// --- i18n: resolve keys to their key name ---------------------------------
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

// --- the feed action hook under test --------------------------------------
jest.mock('@openpeepshq/react', () => ({
  useFeedPostActions: () => ({
    me: { id: 'me-1' },
    myRepost: undefined,
    iReacted: mockMyReactions.length > 0,
    myReactions: mockMyReactions,
    canReply: true,
    canRepost: true,
    canReact: mockCanReact,
    reply,
    toggleRepost,
    toggleReaction,
  }),
}));

// --- local UI: capture picker props and button presses --------------------
jest.mock('./ReactionPicker', () => ({
  ReactionPicker: (props: {
    myReactions: string[];
    onToggle: (r: string) => void;
    onClose: () => void;
  }) => {
    lastPickerProps = props;
    return null;
  },
}));

jest.mock('./ShareMenu', () => ({
  ShareMenu: () => null,
}));

jest.mock('../../ui/button', () => {
  const React = require('react');
  return {
    Button: (props: { children?: ReactNode; onPress?: () => void }) => {
      buttonInstances.push(props);
      return React.createElement('Button', props, props.children);
    },
  };
});

jest.mock('../../ui/themed-text', () => {
  const React = require('react');
  return {
    ThemedText: (props: { children?: ReactNode }) =>
      React.createElement('Text', null, props.children),
  };
});

jest.mock('../../icons/index', () => ({
  Repeat2Icon: () => null,
  ReplyIcon: () => null,
  ShareIcon: () => null,
  ThumbsUpIcon: () => null,
}));

jest.mock('../../../lib/utils', () => ({
  cn: (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(' '),
}));

jest.mock('@openpeepshq/common', () => ({ REACTION_TYPES }));

import { PostActions } from './PostActions';
import type { PublicPost } from '@openpeepshq/common/types';

const makePost = (): PublicPost => ({ id: 'post-1' }) as unknown as PublicPost;

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
/** Depth-first walk visiting every element node. */
function walk(node: unknown, visit: (n: TreeNode) => void): void {
  if (node === null || typeof node !== 'object') return;
  const n = node as TreeNode;
  visit(n);
  for (const c of n.children || []) {
    if (typeof c !== 'string' && c !== null) walk(c, visit);
  }
}

const renderPostActions = (
  post: PublicPost,
  props: { previewMode?: boolean } = {}
) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<PostActions post={post} {...props} />);
  });
  return { tree };
};

/** The React button is the one whose text is the react footer label. */
const reactButtonPress = (json: unknown): (() => void) | undefined => {
  let found: (() => void) | undefined;
  walk(json, (n) => {
    if (found || n.type !== 'Button') return;
    if (collectText(n).includes('posts.footer.react')) {
      found = n.props?.onPress as () => void;
    }
  });
  return found;
};

/** The React button's `disabled` prop (undefined when the button is absent). */
const reactButtonDisabled = (json: unknown): boolean | undefined => {
  let found: boolean | undefined;
  walk(json, (n) => {
    if (found !== undefined || n.type !== 'Button') return;
    if (collectText(n).includes('posts.footer.react')) {
      found = n.props?.disabled as boolean | undefined;
    }
  });
  return found;
};

beforeEach(() => {
  toggleReaction = jest.fn();
  toggleRepost = jest.fn();
  reply = jest.fn();
  mockMyReactions.length = 0;
  mockMyReactions.push('❤️');
  mockCanReact = true;
  lastPickerProps = undefined;
  buttonInstances.length = 0;
});

test('tapping the React button opens the picker wired to the feed actions', () => {
  const { tree } = renderPostActions(makePost());
  const press = reactButtonPress(tree.toJSON());
  expect(press).toBeTruthy();

  expect(lastPickerProps).toBeUndefined();
  ReactTestRenderer.act(() => {
    press!();
  });

  expect(lastPickerProps).toBeDefined();
  expect(lastPickerProps?.myReactions).toEqual(['❤️']);
  tree.unmount();
});

test('picking an emoji from the open picker calls toggleReaction with it', () => {
  const { tree } = renderPostActions(makePost());
  ReactTestRenderer.act(() => {
    reactButtonPress(tree.toJSON())!();
  });
  expect(lastPickerProps).toBeDefined();

  ReactTestRenderer.act(() => {
    lastPickerProps?.onToggle('😂');
  });

  expect(toggleReaction).toHaveBeenCalledTimes(1);
  expect(toggleReaction).toHaveBeenCalledWith('😂');
  tree.unmount();
});

test('the picker close control calls onClose without toggling a reaction', () => {
  const { tree } = renderPostActions(makePost());
  ReactTestRenderer.act(() => {
    reactButtonPress(tree.toJSON())!();
  });
  expect(lastPickerProps).toBeDefined();

  ReactTestRenderer.act(() => {
    lastPickerProps?.onClose();
  });

  expect(toggleReaction).not.toHaveBeenCalled();
  tree.unmount();
});

test('the React button renders disabled when the profile cannot react and has no reactions', () => {
  // Native mirror of the web ReactionPicker contract: without the react
  // capability and no existing reaction, the trigger is inert (the web path
  // pins this in ReactionPicker.test.tsx).
  mockCanReact = false;
  mockMyReactions.length = 0;
  const { tree } = renderPostActions(makePost());
  expect(reactButtonDisabled(tree.toJSON())).toBe(true);
  tree.unmount();
});
