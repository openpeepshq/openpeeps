/**
 * Layout contract for the RN `CompactReplyParent` strip (issue #2074): the
 * author name/handle line renders first and can never be clipped. The strip
 * keeps its `max-h-20` cap but aligns its row content to the start so any
 * residual overflow clips at the bottom instead of the top. The note/question
 * bodies stay clamped to one line via `maxLines={1}`. A visual-attachment
 * thumbnail renders beside the pinned author line, and the hidden/deleted
 * tombstone branches render the placeholder instead of the author line.
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
  View: (props: { className?: string; children?: unknown }) =>
    React.createElement('View', { className: props.className }, props.children),
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
  isHiddenPost: (post: { hidden?: boolean }) => !!post.hidden,
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
  SvgImage: (props: { uri?: string }) =>
    React.createElement('SvgImage', { uri: props.uri }),
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
  ReactTestRenderer.act(() => tree.unmount());
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
  ReactTestRenderer.act(() => tree.unmount());
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
  ReactTestRenderer.act(() => tree.unmount());
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
  ReactTestRenderer.act(() => tree.unmount());
});

test('a block-hidden reply tombstone renders the hidden placeholder, not the reply content', () => {
  // A hidden post (toHiddenPost) reaches the strip the same way a deleted one
  // does, but with `hidden: true` and no `deletedAt`. The web twin branches on
  // `isHiddenPost` and renders `posts.hiddenMessage`; RN must mirror that
  // instead of showing a bare name row with an empty body.
  const tree = render(
    <CompactReplyParent
      post={makePost({
        hidden: true,
        data: { type: 'note', content: 'secret reply body' },
      })}
    />
  );
  const text = jsonText(tree.toJSON());
  // The i18n mock returns keys verbatim, so the placeholder is the key itself.
  expect(text).toContain('posts.hiddenMessage');
  // None of the reply content renders: no body excerpt, no name row.
  const json = JSON.stringify(tree.toJSON());
  expect(json).not.toContain('Excerpt');
  expect(text).not.toContain('A Very Long Display Name');
  expect(text).not.toContain('secret reply body');
  // The deleted placeholder must not render either (hidden is the first branch).
  expect(text).not.toContain('posts.compact.deleted');
  ReactTestRenderer.act(() => tree.unmount());
});

test('a deleted reply renders the deleted placeholder, not the hidden message', () => {
  // Reverse of the hidden-tombstone test: with `hidden` unset the second
  // branch must win, so a future swap of the two ternary arms (or of the
  // `isHiddenPost`/`deletedAt` checks) renders reply content for deleted
  // posts and this fails.
  const tree = render(
    <CompactReplyParent
      post={makePost({
        deletedAt: '2026-11-01T00:00:00.000Z',
        data: { type: 'note', content: 'deleted reply body' },
      })}
    />
  );
  const text = jsonText(tree.toJSON());
  // Keyed on the i18n mock's verbatim key echo — do not simplify the mock to
  // a no-op, it would silently weaken these assertions.
  expect(text).toContain('posts.compact.deleted');
  // None of the reply content renders: no body excerpt, no name row.
  const json = JSON.stringify(tree.toJSON());
  expect(json).not.toContain('Excerpt');
  expect(text).not.toContain('A Very Long Display Name');
  expect(text).not.toContain('deleted reply body');
  // The hidden placeholder must not leak into the deleted branch.
  expect(text).not.toContain('posts.hiddenMessage');
  ReactTestRenderer.act(() => tree.unmount());
});

test('a question post with an image attachment keeps the author line and the compact thumb', () => {
  // The `question` arm of `compactThumb` is one of several (note/question/
  // link/article) that feed the 64×64 thumbnail beside the pinned author line.
  // Pinning it here keeps that branch↔thumbnail pairing from drifting the same
  // way the author line did: a post that should carry a thumb rendering without
  // one (or the thumb detached from its author line) fails this.
  const tree = render(
    <CompactReplyParent
      post={makePost({
        type: 'question',
        data: {
          type: 'question',
          content: 'Which option wins?',
          options: [{ id: 'a' }, { id: 'b' }],
          attachments: [
            {
              type: 'image',
              url: 'https://example.com/poll.png',
              previewUrl: 'https://example.com/poll-preview.png',
              meta: { mimetype: 'image/png' },
            },
          ],
        },
      })}
    />
  );
  const order = flatten(tree.toJSON());
  // The author line still renders for the question branch.
  const nameIdx = order.indexOf('A Very Long Display Name');
  expect(nameIdx).toBeGreaterThanOrEqual(0);
  // Exactly one 64×64 (size-16) thumbnail container renders, and it points
  // at the attachment's preview URL (not the full-size URL).
  const thumbViews = allNodes(tree.toJSON()).filter(
    (n) =>
      n.type === 'View' &&
      typeof n.props?.className === 'string' &&
      n.props.className.includes('size-16')
  );
  expect(thumbViews).toHaveLength(1);
  const svgImage = allNodes(tree.toJSON()).find((n) => n.type === 'SvgImage');
  expect(svgImage).toBeTruthy();
  expect(svgImage?.props.uri).toBe('https://example.com/poll-preview.png');
  // The question body still renders its one-line excerpt + poll-option count.
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Excerpt');
  expect(order).toContain('2 options');
  ReactTestRenderer.act(() => tree.unmount());
});
