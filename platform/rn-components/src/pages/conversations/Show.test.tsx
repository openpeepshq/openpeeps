/**
 * Regression tests for the duplicate participant strip beneath the
 * conversation app bar (issue #2287, plan option A).
 *
 * The web Show page has no app bar, so its identity strip is the only
 * profile block; the RN shell already renders the same participants in the
 * page header (`ConversationProfileHeader`), so the mirrored strip
 * duplicated them. The fix deleted the strip — these tests pin:
 * - 1:1: no `ProfileCard` row under the header, which still carries the
 *   participant;
 * - group: no stacked `ProfileAvatar` row / "View participants" touch
 *   target, and the participants modal still opens from the header;
 * - the page body carries no `border-b` strip between the header and the
 *   message thread (regression guard against re-adding the strip).
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const MESSAGES: Record<string, string> = {
  // Pinned to the en.json value: the removed group strip used this as its
  // accessibility label, so a regression that revives the strip fails on
  // the resolved string rather than the raw key.
  'conversations.participants.openList': 'View participants',
};

const mockT = (key: string) => MESSAGES[key] ?? key;

const me = { id: 'p0', handle: 'me' };
const ada = { id: 'p1', handle: 'ada', displayName: 'Ada' };
const beth = { id: 'p2', handle: 'beth', displayName: 'Beth' };
// No displayName: pre-fix, the group strip's name line rendered `@carl` —
// the strongest text discriminator for the strip's removal.
const carl = { id: 'p3', handle: 'carl' };

// Reassigned per test; the store mock reads it by reference at render
// time (the factory captured the binding, not the value).
let CONVERSATION_MESSAGES: Record<string, unknown>[] = [];

const setPageHeaderSpy = jest.fn();

jest.mock('react-native', () => ({
  View: (props: { className?: string; children?: unknown }) =>
    React.createElement('View', { className: props.className }, props.children),
  ScrollView: (props: { className?: string; children?: unknown }) =>
    React.createElement(
      'ScrollView',
      { className: props.className },
      props.children
    ),
  TouchableOpacity: (props: {
    className?: string;
    accessibilityLabel?: string;
    children?: unknown;
  }) =>
    React.createElement(
      'TouchableOpacity',
      {
        className: props.className,
        accessibilityLabel: props.accessibilityLabel,
      },
      props.children
    ),
  KeyboardAvoidingView: (props: { children?: unknown }) =>
    React.createElement('KeyboardAvoidingView', null, props.children),
  Platform: { OS: 'ios' },
  ActivityIndicator: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useConversation: () => ({
        data: CONVERSATION_MESSAGES,
        isLoading: false,
      }),
      markPostsSeenAction: () => jest.fn(),
      createConversationPostAction: () => jest.fn(),
    },
    currentProfile: me,
    queryClient: {},
    client: {},
  }),
  adjustUnseenCounts: jest.fn(),
  apiErrorMessage: jest.fn(),
  canSendDmMessage: () => false,
  usePostViewFlush: () => () => Promise.resolve(),
  DM_MAX_ATTACHMENTS: 4,
}));

jest.mock('@openpeepshq/common', () => ({}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: React.forwardRef(() => null),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('../../components/layout', () => ({
  useSetPageHeader: (...args: unknown[]) => setPageHeaderSpy(...args),
}));

jest.mock('../../components/ui/themed-view', () => ({
  ThemedView: (props: { className?: string; children?: unknown }) =>
    React.createElement(
      'ThemedView',
      { className: props.className },
      props.children
    ),
}));

jest.mock('../../components/ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../../components/icons/index', () => ({
  ImageIcon: () => null,
  InfoIcon: () => null,
  SearchIcon: () => null,
}));

jest.mock('../../components/custom/index', () => ({
  ImagePickerSheet: React.forwardRef(() => null),
}));

jest.mock('../../components/post/post-form/ComposeAttachments', () => ({
  ComposeAttachments: () => null,
}));

jest.mock('../../components/post/post-form/OpenpeepsMarkdownInput', () => ({
  OpenpeepsMarkdownInput: () => null,
  OpenpeepsComposerInput: () => null,
}));

jest.mock('../../lib/media-permissions', () => ({
  checkMediaPermissions: () => Promise.resolve(false),
}));

jest.mock('../../lib/post', () => ({
  isAttachmentProcessing: () => false,
}));

jest.mock('../../lib/utils', () => ({
  maxContentLength: 5000,
}));

jest.mock('../../components/ui/dropdown-menu', () => ({
  DropdownMenu: (props: { children?: unknown }) =>
    React.createElement('DropdownMenu', null, props.children),
}));

jest.mock('../../components/ui/button', () => ({
  Button: (props: Record<string, unknown>) =>
    React.createElement('Button', props),
}));

jest.mock('../../components/conversations/index', () => ({
  ConversationParticipantsModal: (props: Record<string, unknown>) =>
    React.createElement('ConversationParticipantsModal', props),
  ConversationProfileHeader: (props: Record<string, unknown>) =>
    React.createElement('ConversationProfileHeader', props),
  DirectMessageSearch: () => null,
  MessageInThread: () => null,
}));

// Named stubs so a regression that revives the strip is countable by
// component name (and the pre-fix tree — which imports the real cards and
// their JSX-heavy deps — stays parseable under Jest).
jest.mock('../../components/profile/index', () => ({
  ProfileCard: (props: Record<string, unknown>) =>
    React.createElement('ProfileCard', props),
}));

jest.mock('../../components/profile/Avatar', () => ({
  ProfileAvatar: (props: Record<string, unknown>) =>
    React.createElement('ProfileAvatar', props),
}));

import { ConversationShow } from './Show';

const renderPage = () => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ConversationShow, {
        route: { params: { id: 'conv-1' } },
        navigation: { navigate: jest.fn(), setParams: jest.fn() },
      } as never)
    );
  });
  return tree;
};

const byName = (
  tree: ReturnType<typeof ReactTestRenderer.create>,
  name: string
) =>
  tree.root.findAll(
    (node: { type?: { name?: string } }) =>
      typeof node.type === 'function' && node.type.name === name
  );

// The latest page-header title arg (the page chrome the shell app bar
// renders). `useSetPageHeader` fires in a layout effect, so the last call
// reflects the current participants.
const lastHeader = () => {
  const arg = setPageHeaderSpy.mock.calls.at(-1)?.[0];
  return React.isValidElement(arg) ? arg : null;
};

// All rendered text, including the children of the mocked components.
const allText = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  JSON.stringify(tree.toJSON());

// The strip's container was a `border-b` View above the thread; with the
// app-bar chrome mocked out of the tree, any `border-b` in the page body is
// the strip (the composer uses `border-t`). Word-boundary match: the color
// utility `border-border` contains the substring `border-b`.
const borderBViews = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root.findAll(
    (node: { type?: unknown; props: { className?: unknown } }) =>
      typeof node.type === 'string' &&
      typeof node.props.className === 'string' &&
      /\bborder-b\b/.test(node.props.className)
  );

beforeEach(() => {
  setPageHeaderSpy.mockClear();
});

describe('ConversationShow 1:1 (issue #2287)', () => {
  beforeEach(() => {
    CONVERSATION_MESSAGES = [
      { id: 'm1', profile: ada, audience: [me, ada], seen: true },
    ];
  });

  it('renders no ProfileCard strip under the app-bar header', () => {
    // Pre-fix, the 1:1 strip was a ProfileCard row; the participant must
    // exist only in the page header now.
    const tree = renderPage();
    expect(byName(tree, 'ProfileCard')).toHaveLength(0);
    expect(byName(tree, 'ProfileAvatar')).toHaveLength(0);
    expect(allText(tree)).not.toMatch('@ada');
  });

  it('keeps the ConversationProfileHeader in the page chrome, 1:1', () => {
    renderPage();
    const header = lastHeader();
    expect(header).not.toBeNull();
    expect((header as { type: { name: string } }).type.name).toBe(
      'ConversationProfileHeader'
    );
    expect(
      (header as { props: { participants: unknown } }).props.participants
    ).toEqual([ada]);
    // 1:1: no participants-modal trigger on the header.
    expect(
      (header as { props: { onPress?: unknown } }).props.onPress
    ).toBeUndefined();
  });

  it('renders no border-b profile strip between the header and the thread', () => {
    expect(borderBViews(renderPage())).toHaveLength(0);
  });
});

describe('ConversationShow group (issue #2287)', () => {
  beforeEach(() => {
    CONVERSATION_MESSAGES = [
      { id: 'm1', profile: ada, audience: [me, ada, beth, carl], seen: true },
    ];
  });

  it('renders no stacked-avatar strip and no duplicate "View participants" target', () => {
    // Pre-fix, the group strip rendered up to four ProfileAvatars plus a
    // "View participants" touch target, and `@carl` (no displayName) in its
    // name line.
    const tree = renderPage();
    expect(byName(tree, 'ProfileAvatar')).toHaveLength(0);
    expect(allText(tree)).not.toMatch('@carl');
    const targets = tree.root.findAll(
      (node: { type?: unknown; props: { accessibilityLabel?: unknown } }) =>
        node.type === 'TouchableOpacity' &&
        node.props.accessibilityLabel === 'View participants'
    );
    expect(targets).toHaveLength(0);
  });

  it('keeps the ConversationProfileHeader in the page chrome, group', () => {
    renderPage();
    const header = lastHeader();
    expect(header).not.toBeNull();
    expect((header as { type: { name: string } }).type.name).toBe(
      'ConversationProfileHeader'
    );
    expect(
      (header as { props: { participants: unknown } }).props.participants
    ).toEqual([ada, beth, carl]);
  });

  it('opens the participants modal from the header title', () => {
    const tree = renderPage();
    const header = lastHeader() as { props: { onPress: () => void } };
    expect(typeof header.props.onPress).toBe('function');
    ReactTestRenderer.act(() => {
      header.props.onPress();
    });
    const modal = byName(tree, 'ConversationParticipantsModal');
    expect(modal).toHaveLength(1);
    // The modal (mocked here) is now the only avatar surface — no second
    // stacked-avatar row in the page body.
    expect(byName(tree, 'ProfileAvatar')).toHaveLength(0);
  });

  it('renders no border-b profile strip between the header and the thread', () => {
    expect(borderBViews(renderPage())).toHaveLength(0);
  });
});
