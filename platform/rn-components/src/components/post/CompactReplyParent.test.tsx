/**
 * Layout contract for the RN `CompactReplyParent` strip (issue #2074): the
 * author name/handle line renders first and can never be clipped. The strip
 * keeps its `max-h-20` cap but aligns its row content to the start so any
 * residual overflow clips at the bottom instead of the top. The note/question
 * bodies stay clamped to one line via `maxLines={1}`.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  Pressable: (props: {
    children?: unknown;
    className?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) =>
    React.createElement(
      'Pressable',
      {
        className: props.className,
        onPress: props.onPress,
        accessibilityLabel: props.accessibilityLabel,
      },
      props.children
    ),
  View: (props: Record<string, unknown>) =>
    React.createElement('View', null, props.children),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string | number>) =>
      (key.startsWith('posts.compact.pollOptions')
        ? `${opts?.count} options`
        : key
      ).replace(/\{\{(\w+)\}\}/g, (_m: string, name: string) =>
        String(opts?.[name] ?? '')
      ),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@openpeepshq/common', () => ({
  formatEventWhen: () => '',
}));

jest.mock('../profile/index', () => ({
  ProfileAvatar: () => null,
}));

jest.mock('../icons/index', () => ({
  CalendarIcon: () => null,
  PaperclipIcon: () => null,
  PlayIcon: () => null,
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown>) =>
    React.createElement(
      'ThemedText',
      { numberOfLines: props.numberOfLines },
      props.children
    ),
}));

jest.mock('../ui/themed-view', () => ({
  ThemedView: (props: Record<string, unknown>) =>
    React.createElement(
      'ThemedView',
      { className: props.className },
      props.children
    ),
}));

jest.mock('../ui/svg-image', () => ({
  SvgImage: () => null,
}));

jest.mock('./TruncatedMarkdown', () => ({
  TruncatedMarkdown: (props: {
    maxLines?: number;
    maxChars?: number;
    className?: string;
  }) =>
    React.createElement('Excerpt', {
      maxLines: props.maxLines,
      maxChars: props.maxChars,
      className: props.className,
    }),
}));

import type { ReactElement } from 'react';
import { CompactReplyParent } from './CompactReplyParent';

const makePost = (data: Record<string, unknown>) =>
  ({
    id: 'post-1',
    type: 'note',
    profile: {
      id: 'bob',
      displayName: 'A Very Long Display Name',
      handle: 'some-long-handle-1234',
    },
    data: { type: 'note', content: 'hello' },
    ...data,
  }) as never;

const render = (element: ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

/** Flattened pre-order of the test tree: node types and string children. */
const flatten = (
  node:
    | ReactTestRenderer.ReactTestRendererJSON
    | ReactTestRenderer.ReactTestRendererJSON[]
    | string
    | null
): string[] => {
  if (node == null) return [];
  if (typeof node === 'string') return [node];
  const list = Array.isArray(node) ? node : [node];
  return list.flatMap((n) =>
    typeof n === 'string' ? [n] : [n.type as string, ...flatten(n.children)]
  );
};

/** All string text of a rendered JSON subtree. */
const jsonText = (
  node:
    | ReactTestRenderer.ReactTestRendererJSON
    | ReactTestRenderer.ReactTestRendererJSON[]
    | string
    | null
): string => {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  const list = Array.isArray(node) ? node : [node];
  return list
    .map((n) => (typeof n === 'string' ? n : jsonText(n.children)))
    .join('');
};

/** All JSON nodes of a rendered tree, pre-order. */
const allNodes = (
  node:
    | ReactTestRenderer.ReactTestRendererJSON
    | ReactTestRenderer.ReactTestRendererJSON[]
    | string
    | null
): ReactTestRenderer.ReactTestRendererJSON[] => {
  if (node == null || typeof node === 'string') return [];
  const list = Array.isArray(node) ? node : [node];
  return list.flatMap((n) => [n, ...allNodes(n.children)]);
};

test('the strip container caps height, keeps overflow hidden and aligns content to the start', () => {
  const tree = render(<CompactReplyParent post={makePost({})} />);
  const pressable = tree.root.find((n) => n.type === 'Pressable');
  const cls = pressable.props.className as string;
  expect(cls).toContain('max-h-20');
  expect(cls).toContain('overflow-hidden');
  expect(cls).toContain('items-start');
  expect(cls).not.toContain('items-center');
  tree.unmount();
});

test('the author line renders before the one-line body excerpt', () => {
  const tree = render(
    <CompactReplyParent
      post={makePost({
        data: { type: 'note', content: 'a reply body' },
      })}
    />
  );
  const order = flatten(tree.toJSON());
  const nameIdx = order.indexOf('A Very Long Display Name');
  const bodyIdx = order.indexOf('Excerpt');
  expect(nameIdx).toBeGreaterThanOrEqual(0);
  expect(bodyIdx).toBeGreaterThanOrEqual(0);
  expect(nameIdx).toBeLessThan(bodyIdx);
  tree.unmount();
});

test('the author line is clamped to one line so it can never wrap and clip', () => {
  const tree = render(
    <CompactReplyParent
      post={makePost({
        data: { type: 'note', content: 'a reply body' },
      })}
    />
  );
  // The single-line header clamp: without it a long name+handle would wrap
  // and the wrapped line is exactly what the strip cap would clip. The author
  // row is the ThemedText carrying the display name (and handle), so assert
  // that row is the single-line one.
  const authorRow = allNodes(tree.toJSON()).find(
    (n) =>
      n.type === 'ThemedText' &&
      n.props.numberOfLines === 1 &&
      jsonText(n.children).includes('A Very Long Display Name')
  );
  expect(authorRow).toBeTruthy();
  tree.unmount();
});

test('the note body excerpt is clamped to one line at the sm size', () => {
  const tree = render(
    <CompactReplyParent
      post={makePost({
        data: { type: 'note', content: 'a reply body' },
      })}
    />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Excerpt');
  // maxLines={1} must reach the excerpt (previously dropped on RN).
  expect(json).toContain('"maxLines":1');
  expect(json).toContain('"maxChars":80');
  expect(json).toContain('text-sm text-muted-foreground');
  tree.unmount();
});
