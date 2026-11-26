/**
 * RN pin for the dedicated `kicked` chat-message branch (issue #303
 * round-15 suggestion 1, the RN twin of
 * `platform/react/.../JamChatMessage.test.tsx`).
 *
 * `kicked` is part of the attendance-event union in `jamEventDataSchema`, but
 * `JamChatMessage` deliberately keeps it OUT of the `attendance` array so this
 * branch (profile name + `jams.chat.wasRemoved`) runs instead of the generic
 * attendance renderer. A future edit that adds `kicked` to that array — or
 * reorders the branches — would silently degrade the message to the generic
 * "X kicked the jam" output; these render tests pin the dedicated copy so that
 * regression fails here, on both stacks.
 *
 * Only RN, i18n, the openpeeps context and the leaf primitives are stubbed.
 * `ThemedText` is the single text primitive the message renders through, so
 * the mock records the concatenated string content of every ThemedText it
 * renders — the assertions read that ordered log instead of walking the tree.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// The string content of every ThemedText render, in document order.
const mockRenderedTexts: string[] = [];
let mockProfile:
  | { id: string; displayName: string; handle: string }
  | undefined;
let mockLoading = false;

jest.mock('react-native', () => {
  // Capture the props passed to the message-row TouchableOpacity so the
  // delete-affordance cases can assert on (and drive) `onLongPress`.
  const touchableProps: { onLongPress?: () => void } = {};
  const Touchable = (props: {
    children?: unknown;
    onLongPress?: () => void;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    activeOpacity?: number;
    className?: string;
  }) => {
    touchableProps.onLongPress = props.onLongPress;
    return React.createElement('TouchableOpacity', null, props.children);
  };
  return {
    View: (props: { children?: unknown }) =>
      React.createElement('View', null, props.children),
    TouchableOpacity: Touchable,
    __getTouchableProps: () => touchableProps,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Value mirrors `platform/i18n/src/locales/en.json` jams.chat.wasRemoved
    // so the rendered copy pins the key the user actually sees.
    t: (key: string) =>
      key === 'jams.chat.wasRemoved' ? 'was removed from the jam' : key,
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfile: () => ({ data: mockProfile, isLoading: mockLoading }),
    },
  }),
}));

jest.mock('@openpeepshq/common', () => ({
  // `truncateText` is only used by the message branch, which these cases do
  // not reach; a passthrough keeps the suite parseable.
  truncateText: (text: string | null | undefined) => text ?? '',
}));

jest.mock('../custom/date/updating-date', () => ({
  UpdatingDate: () => React.createElement('UpdatingDate'),
}));

jest.mock('../markdown/index', () => ({
  OpenpeepsMarkdown: () => null,
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) => {
    const parts: string[] = [];
    const collect = (node: unknown) => {
      if (typeof node === 'string' && node) parts.push(node);
      else if (Array.isArray(node)) for (const p of node) collect(p);
    };
    collect(props.children);
    const text = parts.join('');
    if (text) mockRenderedTexts.push(text);
    return React.createElement('ThemedText', null, props.children);
  },
}));

jest.mock('../profile/Avatar', () => ({
  ProfileAvatar: () => React.createElement('ProfileAvatar'),
}));

const { JamChatMessage } = require('./JamChatMessage');

const baseMessage = {
  id: 'evt-1',
  jamId: 'jam-1',
  profileId: 'kicked-1',
  createdAt: '2026-11-22T20:00:00.000Z',
  updatedAt: '2026-11-22T20:00:00.000Z',
};

const renderMessage = (
  message: Record<string, unknown>,
  onDelete?: () => void
) => {
  mockRenderedTexts.length = 0;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(JamChatMessage, { message, onDelete })
    );
  });
  return tree;
};

describe('JamChatMessage kicked branch (RN)', () => {
  beforeEach(() => {
    mockProfile = {
      id: 'kicked-1',
      displayName: 'Kicked Person',
      handle: 'kicked',
    };
    mockLoading = false;
  });

  it('renders the profile name plus the dedicated "was removed" copy', () => {
    renderMessage({ ...baseMessage, type: 'kicked' });
    const rendered = mockRenderedTexts.join('');
    expect(rendered).toContain('Kicked Person');
    expect(rendered).toContain('was removed from the jam');
  });

  it('does not fall through to the generic attendance rendering for kicked', () => {
    // If `kicked` had been (re)added to the `attendance` array, the generic
    // branch would render the raw type as the label ("… kicked the jam")
    // instead of the dedicated copy — that wrong output must not appear.
    renderMessage({ ...baseMessage, type: 'kicked' });
    expect(mockRenderedTexts.join('')).not.toContain('kicked the jam');
  });

  it('still routes real attendance events (join) through the generic branch', () => {
    // Guards against the fix overshooting: `join` keeps the generic
    // "X joined the jam" rendering, proving the dedicated branch only
    // special-cases `kicked`.
    renderMessage({ ...baseMessage, type: 'join' });
    const rendered = mockRenderedTexts.join('');
    expect(rendered).toContain('joined');
    expect(rendered).not.toContain('was removed from the jam');
  });
});

// RN pin for the long-press delete affordance (issue #1587). The message row is
// a `TouchableOpacity` whose `onLongPress` fires the drawer's confirm+delete
// flow; when the viewer cannot delete, `onDelete` is omitted and the bubble has
// no long-press handler (renders exactly as before).
describe('JamChatMessage delete affordance (RN, issue #1587)', () => {
  const getTouchableProps = () =>
    (
      require('react-native') as unknown as {
        __getTouchableProps: () => { onLongPress?: () => void };
      }
    ).__getTouchableProps();

  beforeEach(() => {
    mockProfile = {
      id: 'author-1',
      displayName: 'Author',
      handle: 'author',
    };
    mockLoading = false;
  });

  it('wires onLongPress to onDelete when onDelete is provided', () => {
    const onDelete = jest.fn();
    renderMessage({ ...baseMessage, type: 'message', content: 'hi' }, onDelete);
    const { onLongPress } = getTouchableProps();
    expect(typeof onLongPress).toBe('function');
    ReactTestRenderer.act(() => {
      onLongPress?.();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('leaves the bubble without a long-press handler when onDelete is omitted', () => {
    renderMessage({ ...baseMessage, type: 'message', content: 'hi' });
    const { onLongPress } = getTouchableProps();
    expect(onLongPress).toBeUndefined();
  });
});
