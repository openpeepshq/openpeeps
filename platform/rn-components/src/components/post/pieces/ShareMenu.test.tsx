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
import fs from 'node:fs';
import path from 'node:path';

let mockSignedIn = true;
let mockShareIntoGroup: jest.Mock = jest.fn();
let mockSendToConversation: jest.Mock = jest.fn();

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
    shareIntoGroup: mockShareIntoGroup,
    sendToConversation: mockSendToConversation,
    eventIcsFile: () => null,
  }),
}));

jest.mock('../../icons/index', () => ({
  CalendarIcon: () => null,
  CopyIcon: () => null,
  MessageCircleIcon: () => null,
  Repeat2Icon: () => null,
  SendIcon: () => null,
  ShareIcon: () => null,
  UsersIcon: () => null,
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

jest.mock('./modals/index', () => {
  const React = require('react');
  return {
    // The real modals pull in @gorhom/bottom-sheet (→ react-native-gesture-handler),
    // whose native module is absent from the node jest env. Render a stub the
    // tests can assert against so we can confirm the pickers open on tap.
    ShareIntoGroupModal: (props: { open?: boolean }) =>
      props.open
        ? React.createElement('View', { testID: 'share-into-group-modal' })
        : null,
    SendToConversationModal: (props: { open?: boolean }) =>
      props.open
        ? React.createElement('View', { testID: 'send-to-conversation-modal' })
        : null,
  };
});

import { ShareMenu } from './ShareMenu';

type TreeNode = {
  type?: string;
  props?: Record<string, unknown> | null;
  children?: (TreeNode | string | null)[];
};

function collectText(node: unknown, out: string[] = []): string[] {
  if (node === null || typeof node !== 'object') return out;
  const nodes = Array.isArray(node) ? node : [node];
  for (const entry of nodes) {
    if (typeof entry === 'string') {
      out.push(entry);
      continue;
    }
    if (!entry) continue;
    const n = entry as TreeNode;
    for (const c of n.children || []) {
      if (typeof c === 'string') out.push(c);
      else if (c) collectText(c, out);
    }
  }
  return out;
}

function findByTestID(json: unknown, testID: string): TreeNode | undefined {
  if (json === null || typeof json !== 'object') return undefined;
  const nodes = Array.isArray(json) ? json : [json];
  for (const entry of nodes) {
    if (typeof entry === 'string' || entry === null) continue;
    const node = entry as TreeNode;
    if (node.props?.testID === testID) return node;
    for (const c of node.children || []) {
      if (typeof c !== 'string' && c !== null) {
        const found = findByTestID(c, testID);
        if (found) return found;
      }
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
  mockShareIntoGroup.mockClear();
  mockSendToConversation.mockClear();
});

test('public post: external items, in-community items, and the section header render', () => {
  const tree = render({ id: 'post-1', visibility: 'public' });
  const json = tree.toJSON();
  expect(findByTestID(json, 'menu-Copy link')).toBeTruthy();
  expect(findByTestID(json, 'menu-Share via…')).toBeTruthy();
  expect(findByTestID(json, 'menu-Repost')).toBeTruthy();
  expect(findByTestID(json, 'menu-Send in message')).toBeTruthy();
  expect(findByTestID(json, 'menu-Share into group…')).toBeTruthy();
  expect(findByTestID(json, 'menu-Send to conversation…')).toBeTruthy();
  expect(collectText(json)).toContain('Other options');
  tree.unmount();
});

test('private post: external items and the orphaned section header are gone, all in-community targets stay', () => {
  const tree = render({ id: 'post-2', visibility: 'private' });
  const json = tree.toJSON();
  expect(findByTestID(json, 'menu-Copy link')).toBeUndefined();
  expect(findByTestID(json, 'menu-Share via…')).toBeUndefined();
  expect(findByTestID(json, 'menu-Repost')).toBeTruthy();
  expect(findByTestID(json, 'menu-Send in message')).toBeTruthy();
  // Link-only share: "Share into group…" is available for any post the
  // viewer can see (the link is never a repost), so the public-source gate
  // is gone; DM-thread sharing remains available.
  expect(findByTestID(json, 'menu-Share into group…')).toBeTruthy();
  expect(findByTestID(json, 'menu-Send to conversation…')).toBeTruthy();
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
  expect(findByTestID(json, 'menu-Share into group…')).toBeUndefined();
  expect(findByTestID(json, 'menu-Send to conversation…')).toBeUndefined();
  // No orphaned "Other options" header with nothing above it.
  expect(collectText(json)).not.toContain('Other options');
  tree.unmount();
});

test('tap "Share into group…" opens the group picker (#1851)', () => {
  const tree = render({ id: 'post-1', visibility: 'public' });
  const item = findByTestID(tree.toJSON(), 'menu-Share into group…');
  ReactTestRenderer.act(() => {
    (item?.props?.onPress as () => void)();
  });
  expect(findByTestID(tree.toJSON(), 'share-into-group-modal')).toBeTruthy();
  tree.unmount();
});

test('tap "Send to conversation…" opens the conversation picker (#1851)', () => {
  const tree = render({ id: 'post-1', visibility: 'public' });
  const item = findByTestID(tree.toJSON(), 'menu-Send to conversation…');
  ReactTestRenderer.act(() => {
    (item?.props?.onPress as () => void)();
  });
  expect(
    findByTestID(tree.toJSON(), 'send-to-conversation-modal')
  ).toBeTruthy();
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

// Review round 7 S1 (parity): the review claimed RN "shares link-only" while
// web appends a 200-char excerpt. That divergence does not exist — the link
// note (link + excerpt for public posts, link-only otherwise) is built by the
// SHARED `useShareMenu` hook, and RN wires `onSend={sendToConversation}` to
// exactly that hook function (via `@openpeepshq/react` → `react-native.ts` →
// `hooks/index.ts` → the same `useShareMenu.ts` web uses). This pins that
// contract in the source so a future platform-specific link-only copy can't
// silently reintroduce the divergence the review was worried about. The RN
// modal's own behavior (row list, onSend forwarding, toasts) is covered in
// sharePickers.test.tsx.
test('RN wires "Send to conversation…" to the shared useShareMenu hook, not a local link-only path (#1851 round 7 S1)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'ShareMenu.tsx'), 'utf8');
  // The hook is consumed from the shared react package entry.
  expect(src).toMatch(/from '@openpeepshq\/react'/);
  expect(src).toMatch(/useShareMenu/);
  // `sendToConversation` is destructured from the hook (not defined locally)
  // and handed to the modal as its `onSend`.
  expect(src).toMatch(/\bsendToConversation\b/);
  expect(src).toMatch(/onSend=\{sendToConversation\}/);
  // No local re-implementation of the share payload in this file (the hook
  // owns the API call).
  expect(src).not.toMatch(/createConversationPostAction/);
});
