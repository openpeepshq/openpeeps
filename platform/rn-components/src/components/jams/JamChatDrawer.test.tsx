/**
 * Tests for the JAM chat drawer keyboard handling (issue #1705):
 *
 * - The drawer must present with an iOS-only KeyboardAvoidingView whose
 *   offset is the safe-area top inset (Android branch: disabled + no
 *   behavior), on both platform sides.
 * - It must never crash on hosts that mount no SafeAreaProvider: the
 *   react-native-safe-area-context mock below reproduces the 5.8.0
 *   semantics (context defaults to null; the hook throws on null) so the
 *   drawer's context-based read is what keeps it alive, not a hook mock.
 * - It must re-pin the newest message via the keyboardDidShow listener
 *   (the base-sheet.tsx pattern); that re-pin is iOS-only — on Android the
 *   host's adjustResize handles keyboard avoidance, so no JS listener.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Mirrors react-native-safe-area-context@5.8.0: the context defaults to
// null and useSafeAreaInsets() throws on null (verified in the installed
// lib/commonjs/SafeAreaContext.js). SafeAreaProvider is stubbed to set the
// context, as the real one does once native metrics arrive.
const SafeAreaInsetsContext = React.createContext<{ top: number } | null>(null);
const throwingUseSafeAreaInsets = jest.fn(() => {
  throw new Error(
    'No safe area value available. Make sure you are rendering `<SafeAreaProvider>` at the top of your app.'
  );
});
const insets59 = { top: 59, bottom: 34, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaInsetsContext,
  useSafeAreaInsets: throwingUseSafeAreaInsets,
  // The real 5.8.0 provider only exposes the context once native metrics
  // arrive; this stub models the settled state (context set immediately).
  SafeAreaProvider: (props: Record<string, unknown>) =>
    React.createElement(
      'SafeAreaProvider',
      null,
      React.createElement(
        SafeAreaInsetsContext.Provider,
        { value: insets59 },
        props.children
      )
    ),
}));

const platformState = { os: 'ios' as 'ios' | 'android' };
const flatListState = { handles: [] as Array<{ scrollToEnd: jest.Mock }> };
// Records the Keyboard listeners the drawer subscribes to, so a test can
// fire keyboardDidShow the way the platform does (not by calling a
// component prop directly).
const keyboardState = {
  listeners: [] as Array<{ type: string; cb: jest.Mock }>,
};

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return platformState.os;
    },
  },
  View: (props: Record<string, unknown>) =>
    React.createElement('View', props, props.children),
  Pressable: (props: Record<string, unknown>) =>
    React.createElement('Pressable', props, props.children),
  ActivityIndicator: (props: Record<string, unknown>) =>
    React.createElement('ActivityIndicator', props),
  FlatList: Object.assign(
    React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const handle = { scrollToEnd: jest.fn() };
      flatListState.handles.push(handle);
      React.useImperativeHandle(
        ref as React.Ref<{ scrollToEnd: jest.Mock }>,
        () => handle
      );
      return React.createElement('FlatList', props, props.children);
    }),
    { displayName: 'FlatList' }
  ),
  KeyboardAvoidingView: (props: Record<string, unknown>) =>
    React.createElement('KeyboardAvoidingView', props, props.children),
  Keyboard: {
    addListener: (type: string, cb: jest.Mock) => {
      const entry = { type, cb };
      keyboardState.listeners.push(entry);
      return {
        remove: () => {
          const idx = keyboardState.listeners.indexOf(entry);
          if (idx >= 0) keyboardState.listeners.splice(idx, 1);
        },
      };
    },
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@openpeepshq/react', () => ({
  useJamChat: () => ({
    messages: [],
    mentionProfiles: [],
    isLoading: false,
    isFetchingNextPage: false,
    loadOlder: jest.fn(),
    newMessage: '',
    setNewMessage: jest.fn(),
    isSending: false,
    send: jest.fn(async () => true),
  }),
}));

jest.mock('@livekit/react-native', () => ({
  useParticipants: () => [],
}));

jest.mock('@openpeepshq/common', () => ({}));

jest.mock('./JamDrawer', () => ({
  JamDrawer: (props: Record<string, unknown>) =>
    React.createElement('JamDrawer', props, props.children),
}));

jest.mock('./JamChatMessage', () => ({
  JamChatMessage: (props: Record<string, unknown>) =>
    React.createElement('JamChatMessage', props),
}));

jest.mock('../icons/index', () => ({
  SendHorizontalIcon: (props: Record<string, unknown>) =>
    React.createElement('SendHorizontalIcon', props),
}));

jest.mock('../ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) =>
    React.createElement('Textarea', props),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: Record<string, unknown>) =>
    React.createElement('ThemedText', props, props.children),
}));

import { JamChatDrawer } from './JamChatDrawer';

const hostProvider = { value: insets59 };

const renderDrawer = (
  props: { readOnly?: boolean } = {},
  wrapInHostProvider: boolean = true
) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    const drawer = React.createElement(JamChatDrawer, {
      open: true,
      onClose: jest.fn(),
      ...props,
    });
    tree = ReactTestRenderer.create(
      wrapInHostProvider
        ? React.createElement(
            SafeAreaInsetsContext.Provider,
            hostProvider,
            drawer
          )
        : drawer
    );
  });
  return tree;
};

describe('JamChatDrawer keyboard handling (issue #1705)', () => {
  afterEach(() => {
    platformState.os = 'ios';
    flatListState.handles = [];
    keyboardState.listeners = [];
    throwingUseSafeAreaInsets.mockClear();
  });

  it('presents with the keyboard-avoiding list and composer on iOS', () => {
    const tree = renderDrawer();
    expect(tree.root.findByType('KeyboardAvoidingView')).toBeDefined();
    expect(tree.root.findByType('FlatList')).toBeDefined();
    expect(
      tree.root.findByProps({ placeholder: 'jams.chat.messagePlaceholder' })
    ).toBeDefined();
  });

  it('avoids the keyboard on iOS with the safe-area-top offset', () => {
    const tree = renderDrawer();
    const kav = tree.root.findByType('KeyboardAvoidingView');
    expect(kav.props.enabled).toBe(true);
    expect(kav.props.behavior).toBe('padding');
    expect(kav.props.keyboardVerticalOffset).toBe(59);
  });

  it('disables the keyboard avoidance on Android (host adjustResize handles it)', () => {
    platformState.os = 'android';
    const tree = renderDrawer();
    const kav = tree.root.findByType('KeyboardAvoidingView');
    expect(kav.props.enabled).toBe(false);
    expect(kav.props.behavior).toBeUndefined();
    // Android keyboard avoidance is the host's adjustResize, so the
    // cross-platform contract is: no keyboardDidShow re-pin subscription.
    expect(keyboardState.listeners).toHaveLength(0);
  });

  it('renders without a host SafeAreaProvider instead of throwing', () => {
    // No provider above: the context is null. If the drawer read the hook
    // instead of the context, this render throws (real 5.8.0 semantics).
    const tree = renderDrawer({}, false);
    expect(throwingUseSafeAreaInsets).not.toHaveBeenCalled();
    // The drawer serves its own provider, so the offset still resolves.
    expect(tree.root.findByType('SafeAreaProvider')).toBeDefined();
    const kav = tree.root.findByType('KeyboardAvoidingView');
    expect(kav.props.keyboardVerticalOffset).toBe(59);
  });

  it('keeps the host provider authoritative (no nested provider)', () => {
    const tree = renderDrawer();
    expect(tree.root.findAllByType('SafeAreaProvider')).toHaveLength(0);
    const kav = tree.root.findByType('KeyboardAvoidingView');
    expect(kav.props.keyboardVerticalOffset).toBe(59);
  });

  it('re-pins the newest message when the keyboard shows', () => {
    renderDrawer();
    // The re-pin rides the keyboardDidShow listener (base-sheet.tsx pattern).
    // Fire the subscriber the way the platform would.
    const didShow = keyboardState.listeners.filter(
      (l) => l.type === 'keyboardDidShow'
    );
    expect(didShow).toHaveLength(1);
    const handle = flatListState.handles[flatListState.handles.length - 1];
    ReactTestRenderer.act(() => {
      didShow[0].cb();
    });
    expect(handle.scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it('unsubscribes the keyboard listener when the drawer unmounts', () => {
    const tree = renderDrawer();
    expect(keyboardState.listeners).toHaveLength(1);
    // Tearing down the drawer runs the effect cleanup, which removes the
    // subscription.
    ReactTestRenderer.act(() => {
      tree.unmount();
    });
    expect(keyboardState.listeners).toHaveLength(0);
  });

  it('renders read-only chat without a composer', () => {
    const tree = renderDrawer({ readOnly: true });
    expect(
      tree.root.findAllByProps({ placeholder: 'jams.chat.messagePlaceholder' })
    ).toHaveLength(0);
    expect(tree.root.findByType('FlatList')).toBeDefined();
    // Read-only has no composer to re-pin; no keyboard subscription.
    expect(keyboardState.listeners).toHaveLength(0);
  });
});
