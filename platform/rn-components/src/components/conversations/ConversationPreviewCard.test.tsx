/**
 * Layout containment for ConversationPreviewCard: the preview row must keep
 * long messages and links inside the screen width. RN flex children don't
 * shrink by default, so the row gets `overflow-hidden` containment, the
 * author label gets `shrink-0`, and the message wrapper gets `flex-1
 * min-w-0 overflow-hidden` — otherwise the markdown view sizes to its
 * intrinsic content width and bleeds past the right screen edge.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => ({
  View: React.forwardRef(
    (
      props: { testID?: string; className?: string; children?: unknown },
      ref: unknown
    ) => {
      void ref;
      return React.createElement(
        'View',
        { testID: props.testID, className: props.className },
        props.children
      );
    },
    {
      // react-test-renderer needs a displayName to render forwardRef mocks.
      displayName: 'View',
    }
  ),
  TouchableOpacity: React.forwardRef(
    (
      props: { testID?: string; className?: string; children?: unknown },
      ref: unknown
    ) => {
      void ref;
      return React.createElement(
        'TouchableOpacity',
        { testID: props.testID, className: props.className },
        props.children
      );
    },
    { displayName: 'TouchableOpacity' }
  ),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      switch (key) {
        case 'conversations.titleWithYou':
          return `${opts?.names ?? ''} and You`;
        case 'common.you':
          return 'You';
        case 'conversations.messageInThread.left':
          return `${opts?.name ?? ''} left`;
        default:
          return key;
      }
    },
  }),
}));

jest.mock('@openpeepshq/common', () => ({
  // The jest config maps the `common` root to contentLength.ts only, so these
  // helpers resolve to the stubs, not the built ESM. The stubs must mirror
  // production semantics — isConversationLeavePost in particular is pinned
  // against the real implementation by
  // platform/common/src/lib/__tests__/postHelpers.test.ts; if postHelpers.ts
  // changes, update this stub too (stub drift already bit #2109).
  formatBadgeCount: (n: number) => (n >= 99 ? '99+' : String(n)),
  isConversationLeavePost: (post: {
    inReplyToId?: string | null;
    audience?: { id: string }[] | null;
    profile: { id: string };
  }): boolean => {
    const authorId = post.profile?.id;
    if (!post.inReplyToId || !authorId) return false;
    return !post.audience?.some((p) => p.id === authorId);
  },
  profileName: (profile?: { displayName?: string; handle?: string }) =>
    profile?.displayName || profile?.handle,
  truncateText: (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text,
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({ currentProfile: { id: 'me' } }),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: React.forwardRef(
    (_props: { testID?: string }, ref: unknown) => {
      void ref;
      return React.createElement('BottomSheetModal');
    },
    { displayName: 'BottomSheetModal' }
  ),
}));

jest.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children?: unknown }) =>
    React.createElement('DropdownMenu', null, children),
  DropdownMenuContent: () => null,
  DropdownMenuItem: () => null,
}));

jest.mock('../ui/text', () => ({
  Text: (props: {
    testID?: string;
    className?: string;
    numberOfLines?: number;
    children?: unknown;
  }) =>
    React.createElement(
      'Text',
      {
        testID: props.testID,
        className: props.className,
        numberOfLines: props.numberOfLines,
      },
      props.children
    ),
}));

jest.mock('../markdown/OpenpeepsMarkdown', () => ({
  OpenpeepsMarkdown: ({ source }: { source?: string }) =>
    React.createElement('OpenpeepsMarkdown', { testID: 'markdown' }, source),
}));

jest.mock('../custom/date/updating-date', () => ({
  UpdatingDate: () => null,
}));

jest.mock('../profile/Avatar', () => ({
  ProfileAvatar: () => null,
}));

jest.mock('./ConversationParticipantsModal', () => ({
  ConversationParticipantsModal: () => null,
}));

jest.mock('../icons/index', () => ({
  BellOffIcon: () => null,
  FlagIcon: () => null,
  Trash2Icon: () => null,
  CalendarIcon: () =>
    React.createElement('CalendarIcon', { testID: 'calendar-icon' }),
}));

import type { PublicPost } from '@openpeepshq/common/types';
import { ConversationPreviewCard } from './ConversationPreviewCard';

const me = { id: 'me', displayName: 'Me', handle: 'me' };
const bob = { id: 'bob', displayName: 'Bob', handle: 'bob' };

const makePost = (over: Partial<PublicPost> = {}): PublicPost =>
  ({
    id: 'post-1',
    profile: bob,
    audience: [me, bob],
    createdAt: '2026-01-01T00:00:00.000Z',
    data: { type: 'note', content: 'hello' },
    ...over,
  }) as never;

const render = (element: React.ReactElement) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

const findViews = (
  tree: ReactTestRenderer.ReactTestRenderer,
  predicate: (className: string) => boolean
) =>
  tree.root.findAll(
    (node) =>
      // Host elements only — each mocked View also shows up once as a
      // composite instance, which would double every count.
      node.type === 'View' &&
      typeof node.props.className === 'string' &&
      predicate(node.props.className)
  );

const messageWrapper = (tree: ReactTestRenderer.ReactTestRenderer) => {
  const wrappers = findViews(
    tree,
    (c) =>
      c.includes('flex-1') &&
      c.includes('min-w-0') &&
      c.includes('overflow-hidden')
  );
  expect(wrappers).toHaveLength(1);
  return wrappers[0];
};

test('constrains the message area so previews cannot bleed past the row width', () => {
  const tree = render(
    <ConversationPreviewCard conversation={[makePost()]} onPress={() => {}} />
  );
  const json = JSON.stringify(tree.toJSON());

  // The preview row is clipped at the card boundary, mirroring the web
  // ChatPreview's overflow-hidden row.
  const rows = findViews(
    tree,
    (c) => c.includes('items-start gap-x-2') && c.includes('overflow-hidden')
  );
  expect(rows).toHaveLength(1);

  // The message wrapper must carry all three containment classes together:
  // flex-1 (fill the remaining row width), min-w-0 (RN flex children don't
  // shrink by default) and overflow-hidden (clip inside the card).
  messageWrapper(tree);

  // The author label keeps its intrinsic width so the wrapper gets the rest.
  const labels = findViews(tree, (c) => c.includes('shrink-0'));
  expect(labels).toHaveLength(1);

  // The markdown preview renders inside the constrained wrapper.
  expect(json).toContain('markdown');
  tree.unmount();
});

test('truncates the title to a single line deterministically', () => {
  const tree = render(
    <ConversationPreviewCard conversation={[makePost()]} onPress={() => {}} />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('"numberOfLines":1');
  tree.unmount();
});

test('constrains the event-name preview the same way', () => {
  const tree = render(
    <ConversationPreviewCard
      conversation={[
        makePost({
          id: 'event-post',
          data: {
            type: 'event',
            name: 'A very long event name that should stay inside the card',
          },
        }),
      ]}
      onPress={() => {}}
    />
  );
  const json = JSON.stringify(tree.toJSON());
  // Same containment classes as the markdown path, on the event wrapper.
  messageWrapper(tree);
  expect(json).toContain('A very long event name');
  expect(json).toContain('calendar-icon');
  tree.unmount();
});

test('leaves a leave post with the "left" label, no message wrapper', () => {
  const tree = render(
    <ConversationPreviewCard
      conversation={[
        makePost({
          id: 'leave-post',
          inReplyToId: 'prev-1',
          audience: [me],
          data: { type: 'note', content: 'should not render' },
        }),
      ]}
      onPress={() => {}}
    />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Bob left');
  // The leave post's message content is never rendered.
  expect(json).not.toContain('should not render');
  expect(json).not.toContain('markdown');
  tree.unmount();
});
