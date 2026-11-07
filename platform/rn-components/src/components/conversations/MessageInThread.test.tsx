/**
 * Leave rendering for MessageInThread: a leave (a reply that leaves its
 * author out of the audience) renders only the "left" label, with the
 * post-view ref wired to the label so the post still counts as seen.
 *
 * The View mock records the ref it is handed instead of asserting on
 * ref.current: in this node jest environment (react 19.2.6 +
 * react-test-renderer 19.2.3) host-element refs are never attached, even
 * for plain host elements, while class refs work — an environment
 * quirk, so the ref wiring is asserted directly.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const mockViewRefs: unknown[] = [];

jest.mock('react-native', () => ({
  View: React.forwardRef((props: { children?: unknown }, ref: unknown) => {
    if (ref) mockViewRefs.push(ref);
    return React.createElement('View', null, props.children);
  }),
}));

jest.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'conversations.messageInThread.startedBy': 'Started by {{name}}',
    'conversations.messageInThread.addedBy': 'Added by {{name}}',
    'conversations.messageInThread.left': '{{name}} left',
    'conversations.messageInThread.removedBy': 'Removed by {{name}}',
  };
  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, string>) =>
        (translations[key] ?? key).replace(
          /\{\{(\w+)\}\}/g,
          (_match: string, name: string) => opts?.[name] ?? ''
        ),
    }),
  };
});

jest.mock('@openpeepshq/common', () => {
  // Mirrored from platform/common/src/lib/postHelpers.ts — the built
  // package ships ESM which Jest's node transform doesn't cover.
  const isConversationLeavePost = (post: {
    inReplyToId?: string | null;
    audience?: { id: string }[] | null;
    profile: { id: string };
  }): boolean => {
    const authorId = post.profile?.id;
    if (!post.inReplyToId || !authorId) return false;
    return !post.audience?.some((p) => p.id === authorId);
  };
  return {
    profileName: (profile?: { displayName?: string; handle?: string }) =>
      profile?.displayName || profile?.handle,
    isConversationLeavePost,
  };
});

jest.mock('@openpeepshq/react', () => ({
  useCurrentProfile: () => undefined,
  isUnreadPostForViewer: () => false,
}));

const mockPostViewRef = { current: null as unknown };

jest.mock('../../hooks/use-post-view-ref', () => ({
  usePostViewRef: () => mockPostViewRef,
}));

jest.mock('./ConversationMessageBubble', () => ({
  ConversationMessageBubble: () =>
    React.createElement('Text', { testID: 'message-bubble' }, 'message bubble'),
}));

jest.mock('../profile/Avatar', () => ({
  ProfileAvatar: () => null,
}));

jest.mock('../custom/date/updating-date', () => ({
  UpdatingDate: () => null,
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: ({ children }: { children?: unknown }) =>
    React.createElement('Text', null, children),
}));

import type { PublicPost } from '@openpeepshq/common/types';
import { MessageInThread } from './MessageInThread';

const bob = { id: 'bob', displayName: 'Bob', handle: 'bob' };
const alice = { id: 'alice', displayName: 'Alice', handle: 'alice' };

const makePost = (over: Partial<PublicPost> = {}): PublicPost =>
  ({
    id: 'post-1',
    profile: bob,
    audience: [alice, bob],
    createdAt: '2026-01-01T00:00:00.000Z',
    data: { type: 'note', content: 'hello' },
    ...over,
  }) as never;

const render = (element: React.ReactElement) => {
  mockViewRefs.length = 0;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

test('renders only the left label for a leave post and wires the view ref to it', () => {
  const tree = render(
    <MessageInThread
      previous={makePost({ id: 'prev-1' })}
      message={makePost({ inReplyToId: 'prev-1', audience: [alice] })}
    />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Bob left');
  expect(json).not.toContain('message bubble');
  // The leave label is the only rendered View that carries the post-view
  // ref, so the ref must have been wired to it.
  expect(mockViewRefs).toEqual([mockPostViewRef]);
  tree.unmount();
});

test('renders a leave post as left even when it is the first loaded post', () => {
  const tree = render(
    <MessageInThread
      previous={undefined}
      message={makePost({ inReplyToId: 'prev-1', audience: [alice] })}
    />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Bob left');
  expect(json).not.toContain('Added by');
  tree.unmount();
});

test('renders a root post outside its own audience as a message, not a leave', () => {
  const tree = render(
    <MessageInThread
      previous={undefined}
      message={makePost({ audience: [alice] })}
    />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('message bubble');
  expect(json).not.toContain('left');
  tree.unmount();
});

test('renders a reply the author takes part in as a message', () => {
  const tree = render(
    <MessageInThread
      previous={makePost({ id: 'prev-1' })}
      message={makePost({ inReplyToId: 'prev-1' })}
    />
  );
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('message bubble');
  expect(json).not.toContain('Bob left');
  tree.unmount();
});
