/**
 * ShareMenu external-share gating (issue #306 review round).
 *
 * Pins the decision tree from the ShareMenu contract: external items
 * ("Share via…", "Copy link") render only for publicly shareable posts,
 * while repost / send-in-message stay available for any post the viewer can
 * see, and the "Other options" header only renders when something follows it.
 *
 * Mirrors the inline-mock pattern of FullEvent.test.tsx on main: node jest
 * env, every external import mocked; the built common package ships ESM, so
 * the predicate is mirrored inline (its real semantics are exhaustively
 * unit-tested in platform/common).
 */
import { type ReactNode } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';

let mockSignedIn = true;

jest.mock('react-native', () => ({
  Share: { share: jest.fn() },
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  writeFile: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/native-stack', () => ({}));

jest.mock('@openpeepshq/common/lib', () => ({
  isPubliclyShareable: (post: { visibility: string }) =>
    post.visibility === 'public',
}));

jest.mock('@openpeepshq/react', () => ({
  postPublicPath: (post: { id: string }) => `/posts/${post.id}`,
  useShareMenu: () => ({
    signedIn: mockSignedIn,
    isEvent: false,
    repost: jest.fn(),
    eventIcsFile: () => null,
  }),
}));

jest.mock('../../icons/index', () => ({
  CalendarIcon: () => null,
  CopyIcon: () => null,
  Repeat2Icon: () => null,
  SendIcon: () => null,
  ShareIcon: () => null,
}));

jest.mock('../../ui', () => {
  const React = require('react');
  return {
    PopupMenu: (props: { children?: ReactNode }) =>
      React.createElement('View', null, props.children),
    PopupMenuButton: (props: { text?: string; action?: unknown }) =>
      React.createElement('View', {
        testID: `menu-${props.text}`,
        onPress: typeof props.action === 'function' ? props.action : undefined,
      }),
    PopupSection: (props: { title: string }) =>
      React.createElement('Text', null, props.title),
    PopupSeparator: () => null,
  };
});

jest.mock('../../../lib/constants', () => ({
  BASE_URL: 'https://community.example',
}));

jest.mock('../../../stores/useNewConversationStore', () => ({
  useNewConversationStore: (selector: (s: unknown) => unknown) =>
    selector({ setContt: jest.fn() }),
}));

import { ShareMenu } from './ShareMenu';

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

function findByTestID(json: unknown, testID: string): TreeNode | undefined {
  if (json === null || typeof json !== 'object') return undefined;
  const node = json as TreeNode;
  if (node.props?.testID === testID) return node;
  for (const c of node.children || []) {
    if (typeof c !== 'string' && c !== null) {
      const found = findByTestID(c, testID);
      if (found) return found;
    }
  }
  return undefined;
}

const render = (post: unknown) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ShareMenu post={post as never} />);
  });
  return tree;
};

beforeEach(() => {
  mockSignedIn = true;
  (Toast.show as jest.Mock).mockClear();
  (Clipboard.setString as jest.Mock).mockClear();
});

test('public post: external items, in-community items, and the section header render', () => {
  const tree = render({ id: 'post-1', visibility: 'public' });
  const json = tree.toJSON();
  expect(findByTestID(json, 'menu-Copy link')).toBeTruthy();
  expect(findByTestID(json, 'menu-Share via…')).toBeTruthy();
  expect(findByTestID(json, 'menu-Repost')).toBeTruthy();
  expect(findByTestID(json, 'menu-Send in message')).toBeTruthy();
  expect(collectText(json)).toContain('Other options');
  tree.unmount();
});

test('private post: external items and the orphaned section header are gone, repost/DM stay', () => {
  const tree = render({ id: 'post-2', visibility: 'private' });
  const json = tree.toJSON();
  expect(findByTestID(json, 'menu-Copy link')).toBeUndefined();
  expect(findByTestID(json, 'menu-Share via…')).toBeUndefined();
  expect(findByTestID(json, 'menu-Repost')).toBeTruthy();
  expect(findByTestID(json, 'menu-Send in message')).toBeTruthy();
  expect(collectText(json)).not.toContain('Other options');
  tree.unmount();
});

test('copy link copies the public URL and toasts the shared shareMenu key (#306 round 2)', () => {
  const tree = render({ id: 'post-1', visibility: 'public' });
  const item = findByTestID(tree.toJSON(), 'menu-Copy link');
  ReactTestRenderer.act(() => {
    (item?.props?.onPress as () => void)();
  });
  expect(Clipboard.setString).toHaveBeenCalledWith(
    'https://community.example/posts/post-1'
  );
  expect(Toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ text1: 'Link copied' })
  );
  tree.unmount();
});

test('system share sends the post URL to the share sheet on both payload shapes (#306 round 2 S4)', async () => {
  const tree = render({ id: 'post-1', visibility: 'public' });
  const item = findByTestID(tree.toJSON(), 'menu-Share via…');
  await ReactTestRenderer.act(async () => {
    await (item?.props?.onPress as () => Promise<void>)();
  });
  const arg = (Share.share as jest.Mock).mock.calls[0][0];
  // iOS consumes `url`; Android builds the sheet from `message` only.
  expect(arg.url).toBe('https://community.example/posts/post-1');
  expect(arg.message).toBe('https://community.example/posts/post-1');
  tree.unmount();
});

test('signed-out viewer of a public post sees only external items, no in-community (#306 round 5 S4)', () => {
  mockSignedIn = false;
  const tree = render({ id: 'post-1', visibility: 'public' });
  const json = tree.toJSON();
  expect(findByTestID(json, 'menu-Copy link')).toBeTruthy();
  expect(findByTestID(json, 'menu-Share via…')).toBeTruthy();
  expect(findByTestID(json, 'menu-Repost')).toBeUndefined();
  expect(findByTestID(json, 'menu-Send in message')).toBeUndefined();
  // No orphaned "Other options" header with nothing above it.
  expect(collectText(json)).not.toContain('Other options');
  tree.unmount();
});

test('signed-out viewer of a non-public post gets no Share menu at all (#306 round 5 S1)', () => {
  mockSignedIn = false;
  const tree = render({ id: 'post-2', visibility: 'private' });
  // The whole affordance (button + menu) is removed instead of opening an
  // empty dropdown.
  expect(tree.toJSON()).toBeNull();
  tree.unmount();
});
