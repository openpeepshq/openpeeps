/**
 * Regression test for the conversation-row list keys (issue #2107 review S1).
 *
 * The DM list swapped `key={idx}` for `key={first.id}` — the first (oldest
 * root) post identifies the thread, matching the web list — but nothing
 * pinned that: a regression back to index keys would pass CI. The sibling
 * `New.test.tsx` ("row keying (issue #1666 review S3)") reads keys off
 * `_currentFiber()` because React strips them from `toJSON()`; this test does
 * the same for the conversation rows.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Merged 1:1 threads: `conversation[0]` is the oldest root post and
// identifies the thread. The first thread carries two posts so the test also
// pins the key to the *first* post id (a regression to the last post id
// would fail).
const ada = { id: 'p-ada', handle: 'ada', displayName: 'Ada' };
const beth = { id: 'p-beth', handle: 'beth', displayName: 'Beth' };
const CONVERSATIONS: { id: string; profile: { id: string } }[][] = [
  [
    { id: 'post-a1', profile: ada },
    { id: 'post-a2', profile: ada },
  ],
  [{ id: 'post-b1', profile: beth }],
];

jest.mock('react-native', () => ({
  View: (props: { testID?: string; className?: string; children?: unknown }) =>
    React.createElement(
      'View',
      { testID: props.testID, className: props.className },
      props.children
    ),
  TouchableOpacity: (props: {
    testID?: string;
    className?: string;
    children?: unknown;
  }) =>
    React.createElement(
      'TouchableOpacity',
      { testID: props.testID, className: props.className },
      props.children
    ),
  ActivityIndicator: () => null,
  RefreshControl: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: (props: { children?: unknown }) =>
    React.createElement('KeyboardAwareScrollView', null, props.children),
}));

jest.mock('@openpeepshq/react', () => ({
  useAuthData: () => ({}),
  useOpenpeeps: () => ({
    currentProfile: { id: 'me' },
    openpeepsApi: {
      useConversations: () => ({
        data: CONVERSATIONS,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      }),
      useArchivedConversations: () => ({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      }),
      useUnseenPostCounts: () => ({ data: { direct: {} } }),
    },
  }),
}));

jest.mock('@openpeepshq/common', () => ({
  canCreatePost: () => false,
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: React.forwardRef(() => null),
}));

jest.mock('../../components/icons/index', () => ({
  MessageCircleOffIcon: () => null,
  MessageSquarePlusIcon: () => null,
}));

jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../components/layout', () => ({
  useSetPageHeader: jest.fn(),
  useSetPlusButtonActions: jest.fn(),
}));

jest.mock('../../components/conversations/index', () => {
  const ConversationSettingsSheet = React.forwardRef(() => null);
  return {
    // Named so the test can locate the rows (the object-literal shorthand
    // sets the function's `name`); the key under test lives on the element
    // Index.tsx renders.
    ConversationPreviewCard: (props: Record<string, unknown>) =>
      React.createElement('ConversationPreviewCard', props),
    DirectMessageSearch: () => null,
    useCreateNewConversation: () => ({ openCreateConversation: jest.fn() }),
    ConversationSettingsSheet,
  };
});

import { ConversationsIndex } from './Index';

describe('ConversationsIndex row keying (issue #2107 review S1)', () => {
  it('keys the conversation rows by the first post id, not array index', () => {
    let tree: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(ConversationsIndex, {
          navigation: { navigate: jest.fn() },
        } as never)
      );
    });
    // React strips keys from the public TestInstance / toJSON output; the
    // key only lives on the fiber, so read it from there (same pattern as
    // New.test.tsx). With the fixed `key={first.id}` these are the first
    // post ids of each thread; a regression to `key={idx}` would yield
    // "0"/"1" and a regression to the last post id would yield "post-a2".
    const rowKeys = tree.root
      .findAll(
        (node: { type?: { name?: string } }) =>
          typeof node.type === 'function' &&
          node.type.name === 'ConversationPreviewCard'
      )
      .map(
        (node: { _currentFiber: () => { key: string } }) =>
          node._currentFiber().key
      );
    expect(rowKeys).toEqual(['post-a1', 'post-b1']);
  });
});
