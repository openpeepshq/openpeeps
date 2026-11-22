/**
 * Regression test for the native DM-bubble reaction wiring (issue #276,
 * round-5 review item #2) — the mirror of the web bubble test. The bubble must
 * feed the picker the profile's reactions and the community's allowed set, and
 * route the picker's toggle back through `usePostReactionToggle` (which also
 * closes the picker). Without this, a DM bubble could silently drop the picker
 * or call the toggle with the wrong emoji.
 *
 * Only the RN primitives, i18n, theme, and the `@openpeepshq/react` hooks are
 * stubbed; the real `ConversationMessageBubble` open/close state machine runs.
 * The picker is stubbed to a self-describing host tag so its props are read
 * from the rendered tree.
 */
const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const mockToggle = jest.fn();
const mockCanReact = { value: true };
const mockMyReactions = { value: ['👍'] };
const mockAllowed = { value: ['👍', '🎉'] as readonly string[] };

jest.mock('react-native', () => ({
  View: (p: { children?: unknown }) =>
    React.createElement('View', null, p.children),
  Text: (p: { children?: unknown }) =>
    React.createElement('Text', null, p.children),
  Pressable: (p: { onPress?: () => void; children?: unknown }) =>
    React.createElement('Pressable', { onPress: p.onPress }, p.children),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../theme/useThemeOpacity', () => ({
  useThemeOpacity: () => ({ background: () => undefined }),
}));
jest.mock('../post/FeedPostContent', () => ({
  FeedPostContent: () => null,
}));
jest.mock('../post/pieces/UnreadPostIndicator', () => ({
  UnreadPostIndicator: () => null,
}));
jest.mock('../icons/index', () => ({
  ThumbsUpIcon: () => null,
}));
// The closed trigger shows the reaction count next to the icon (round-10
// review item #1/#2). Mock ThemedText to a host tag that carries the count so
// the display can be asserted without loading @rn-primitives.
jest.mock('../ui/themed-text', () => ({
  ThemedText: (p: { children?: unknown; className?: string }) =>
    React.createElement(
      'CountText',
      { 'data-count': String(p.children) },
      p.children
    ),
}));
jest.mock('@openpeepshq/react', () => ({
  useCurrentProfile: () => ({ id: 'me-1' }),
  usePostReactionToggle: () => ({
    iLiked: false,
    myReactions: mockMyReactions.value,
    canReact: mockCanReact.value,
    toggleReaction: mockToggle,
  }),
  useAllowedReactions: () => mockAllowed.value,
}));
jest.mock('../post/pieces/ReactionPicker', () => ({
  ReactionPicker: (props: {
    myReactions: string[];
    reactions: readonly string[];
    onToggle: (reaction: string) => void;
  }) =>
    React.createElement(
      'PICKER',
      { onPress: () => props.onToggle('🎉') },
      `MR=${JSON.stringify(props.myReactions)}`,
      `RC=${JSON.stringify(props.reactions)}`
    ),
}));

const { ConversationMessageBubble } = require('./ConversationMessageBubble');

const renderBubble = (message: unknown) => {
  let tree!: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ConversationMessageBubble, { message })
    );
  });
  return tree;
};

const message = { id: 'post-1', profile: { id: 'other-1' } };

describe('ConversationMessageBubble (native) reaction wiring', () => {
  beforeEach(() => {
    mockToggle.mockClear();
    mockCanReact.value = true;
    mockMyReactions.value = ['👍'];
    mockAllowed.value = ['👍', '🎉'];
  });

  it('feeds the picker the profile reactions and allowed set on open', () => {
    const tree = renderBubble(message);
    // Closed by default: a thumbs-up trigger, no picker yet.
    expect(tree.root.findAllByType('PICKER').length).toBe(0);
    const trigger = tree.root.findAllByType('Pressable')[0];
    ReactTestRenderer.act(() => {
      trigger.props.onPress();
    });
    // The picker opened and was fed the profile reactions + allowed set.
    const picker = tree.root.findAllByType('PICKER')[0];
    const text = (picker.children ?? []).join(' ');
    expect(text).toContain('MR=["👍"]');
    expect(text).toContain('RC=["👍","🎉"]');
  });

  it('routes the picker toggle through toggleReaction and closes', () => {
    const tree = renderBubble(message);
    ReactTestRenderer.act(() => {
      tree.root.findAllByType('Pressable')[0].props.onPress();
    });
    const picker = tree.root.findAllByType('PICKER')[0];
    ReactTestRenderer.act(() => {
      picker.props.onPress();
    });
    expect(mockToggle).toHaveBeenCalledWith('🎉');
    // The picker closed back to the trigger.
    expect(tree.root.findAllByType('PICKER').length).toBe(0);
  });

  it('renders no trigger when the profile cannot react', () => {
    mockCanReact.value = false;
    const tree = renderBubble(message);
    expect(tree.root.findAllByType('Pressable').length).toBe(0);
    expect(tree.root.findAllByType('PICKER').length).toBe(0);
  });

  it('hides the reaction count on the closed trigger when there are no reactions', () => {
    const tree = renderBubble({ ...message, reactions: [] });
    expect(tree.root.findAllByType('CountText').length).toBe(0);
  });

  it('shows the reaction count on the closed trigger when reactions exist', () => {
    const withReactions = {
      ...message,
      reactions: [
        { reaction: '👍', profile: { id: 'other-2' } },
        { reaction: '🎉', profile: { id: 'other-3' } },
      ],
    };
    const tree = renderBubble(withReactions);
    const counts = tree.root.findAllByType('CountText');
    expect(counts).toHaveLength(1);
    expect(counts[0].props['data-count']).toBe('2');
    // The picker is still closed: the count is on the trigger, not a picker.
    expect(tree.root.findAllByType('PICKER').length).toBe(0);
  });
});
