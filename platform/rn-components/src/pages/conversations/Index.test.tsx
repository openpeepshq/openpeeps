/**
 * Regression tests for the conversation-row list keys (issue #2107 review
 * S1), the per-row unread-badge indexing, and the `conversation[0]`
 * first-post contract (review S1–S3, round 8).
 *
 * The DM list swapped `key={idx}` for `key={first.id}` — the first (oldest
 * root) post identifies the thread, matching the web list — but nothing
 * pinned that: a regression back to index keys would pass CI. The sibling
 * `New.test.tsx` ("row keying (issue #1666 review S3)") reads keys off
 * `_currentFiber()` because React strips them from `toJSON()`; the tests
 * here do the same for the conversation rows.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Merged 1:1 threads: `conversation[0]` is the oldest root post and
// identifies the thread. Both threads carry two posts, interleaved
// (a1, b1, a2): with a single multi-post thread, keying by the *last*
// post id happens to yield the same key list as first-post keying, so the
// keying test is not mutation-tight — the interleaved shape makes
// leaf-keying produce `['post-a2','post-b2']` and fail. The empty third
// group exercises the `!first → null` guard: an empty conversation group
// is skipped, not crashed on.
const ada = { id: 'p-ada', handle: 'ada', displayName: 'Ada' };
const beth = { id: 'p-beth', handle: 'beth', displayName: 'Beth' };
const CONVERSATIONS: { id: string; profile: { id: string } }[][] = [
  [
    { id: 'post-a1', profile: ada },
    { id: 'post-b1', profile: beth },
    { id: 'post-a2', profile: ada },
  ],
  [{ id: 'post-b2', profile: beth }],
  [],
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

// The badge contract tests need a per-test unread map; `useUnseenPostCounts`
// reads whatever this points at, so the tests set `UNSEEN_BY_CONVERSATION`
// before each render.
const UNSEEN_BY_CONVERSATION: { direct: Record<string, number> } = {
  direct: {},
};

// Each test overwrites `UNSEEN_BY_CONVERSATION.direct` before rendering;
// reset it afterwards so a test that forgets to set it cannot inherit a
// previous test's counts (review S2, round 9).
afterEach(() => {
  UNSEEN_BY_CONVERSATION.direct = {};
});

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
      useUnseenPostCounts: () => ({ data: UNSEEN_BY_CONVERSATION }),
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
  ThemedText: (props: Record<string, unknown> & { children?: unknown }) =>
    React.createElement('ThemedText', props, props.children),
  TextClassContext: {
    Provider: ({ children }: { children?: unknown }) => children,
  },
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

const renderIndex = () => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ConversationsIndex, {
        navigation: { navigate: jest.fn() },
      } as never)
    );
  });
  return tree;
};

const rowNodes = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAll(
    (node: { type?: { name?: string } }) =>
      typeof node.type === 'function' &&
      node.type.name === 'ConversationPreviewCard'
  );

describe('ConversationsIndex row keying (issue #2107 review S1)', () => {
  it('keys the conversation rows by the first post id, not array index or leaf', () => {
    const tree = renderIndex();
    // React strips keys from the public TestInstance / toJSON output; the
    // key only lives on the fiber, so read it from there (same pattern as
    // New.test.tsx). With the fixed `key={first.id}` these are the first
    // (oldest root) post ids of each thread; a regression to `key={idx}`
    // would yield "0"/"1" and a regression to the leaf (last) post id
    // would yield "post-a2"/"post-b2" (the mock is interleaved so a
    // single-multi-post-thread layout cannot hide the leaf-keying
    // regression — review S3).
    const rowKeys = rowNodes(tree).map(
      (node: { _currentFiber: () => { key: string } }) =>
        node._currentFiber().key
    );
    // Exactly two rows: the empty group was skipped by the `!first → null`
    // guard (rendered above without throwing), and the keys are still the
    // first post ids of the non-empty threads.
    expect(rowKeys).toEqual(['post-a1', 'post-b2']);
  });
});

describe('ConversationsIndex unread-badge wiring (issue #2107 review S1–S2)', () => {
  it('indexes each row by its own first post and falls back to 0, never other rows', () => {
    // `post-a1` is the first post of the first row; `post-a2` is that
    // thread's leaf (never used for indexing); `archived-root-id` is a
    // thread root absent from the active preview list (an archived thread
    // the user left). A regression that pools the counts instead of
    // indexing per row would hand the first row 2 + 3 + 5 = 10.
    UNSEEN_BY_CONVERSATION.direct = {
      'post-a1': 2,
      'post-a2': 3,
      'archived-root-id': 5,
    };
    const tree = renderIndex();
    const rows = rowNodes(tree);
    expect(rows).toHaveLength(2);
    // The mocked card does not render the badge itself — it carries the
    // exact `unreadCount` the page passed; that prop is what the
    // `unreadCount > 0` branch inside the real card consumes.
    expect(rows[0].props.unreadCount).toBe(2);
    // The second row's first post (`post-b2`) is absent from the map: the
    // `?? 0` fallback suppresses its badge entirely.
    expect(rows[1].props.unreadCount).toBe(0);
  });

  it('pins the page↔core contract: rows and badges index conversation[0] (the oldest root)', () => {
    // `mergeOneToOnePreviews` orders each 1:1 group `[oldest root, …,
    // newest leaf]`; the page assumes the row identity and the badge
    // index both come from `conversation[0]`. If core ever returned a
    // group with the newest post first, the badge would index the leaf
    // and silently drop counts — this mock mirrors the shape the contract
    // depends on: row one carries the unseen count on its OLDEST root
    // (`post-a1`), not its leaf (`post-a2`).
    UNSEEN_BY_CONVERSATION.direct = {
      'post-a1': 4,
    };
    const tree = renderIndex();
    const rows = rowNodes(tree);
    expect(rows).toHaveLength(2);
    // Row identity follows the same contract: the keys are the oldest
    // roots, in the order the page renders them.
    const rowKeys = rows.map(
      (node: { _currentFiber: () => { key: string } }) =>
        node._currentFiber().key
    );
    expect(rowKeys).toEqual(['post-a1', 'post-b2']);
    // The unseen count lands on the row whose first post owns it.
    expect(rows[0].props.unreadCount).toBe(4);
    expect(rows[1].props.unreadCount).toBe(0);
  });
});
