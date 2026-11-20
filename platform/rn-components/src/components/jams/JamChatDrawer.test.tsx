/**
 * Tests for the JAM chat drawer keyboard handling (issue #1705):
 *
 * - The drawer must present with a KeyboardAvoidingView on both platforms,
 *   both using behavior 'padding' and offset = the safe-area top inset
 *   (the KAV's parent screen-Y). The KAV must be enabled on Android too —
 *   avoidance is the component's own job, not the host app's
 *   windowSoftInputMode (the QA retest on the shipping host found the
 *   keyboard still covers the chat when the host does not resize).
 * - It must never crash on hosts that mount no SafeAreaProvider: the
 *   react-native-safe-area-context mock below reproduces the 5.8.0
 *   semantics (context defaults to null; the hook throws on null) so the
 *   drawer's context-based read is what keeps it alive, not a hook mock.
 * - It must re-pin the newest message via the keyboardDidShow listener
 *   (the base-sheet.tsx pattern) on both platforms — the KAV reflow lands
 *   after the keyboard animation, so the re-pin settles the newest message
 *   above the composer; skipped when readOnly (no composer to re-pin).
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
  SafeAreaProvider: (props: MockElementProps) =>
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

// Type-safe stub props: the mocks render through React.createElement with
// the same prop names the component passes, so a shared interface (instead
// of Record<string, unknown>) catches prop-name drift at compile time.
interface MockElementProps {
  children?: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  onPress?: () => void;
  disabled?: boolean;
  editable?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  numberOfLines?: number;
  placeholder?: string;
  size?: number;
  behavior?: string;
  keyboardVerticalOffset?: number;
  ref?: React.Ref<unknown>;
  [key: string]: unknown;
}

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
  View: (props: MockElementProps) =>
    React.createElement('View', props, props.children),
  Pressable: (props: MockElementProps) =>
    React.createElement('Pressable', props, props.children),
  ActivityIndicator: (props: MockElementProps) =>
    React.createElement('ActivityIndicator', props),
  FlatList: Object.assign(
    React.forwardRef((props: MockElementProps, ref: unknown) => {
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
  KeyboardAvoidingView: (props: MockElementProps) =>
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
  JamDrawer: (props: MockElementProps) =>
    React.createElement('JamDrawer', props, props.children),
}));

jest.mock('./JamChatMessage', () => ({
  JamChatMessage: (props: MockElementProps) =>
    React.createElement('JamChatMessage', props),
}));

jest.mock('../icons/index', () => ({
  SendHorizontalIcon: (props: MockElementProps) =>
    React.createElement('SendHorizontalIcon', props),
}));

jest.mock('../ui/textarea', () => ({
  Textarea: (props: MockElementProps) => React.createElement('Textarea', props),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: MockElementProps) =>
    React.createElement('ThemedText', props, props.children),
}));

import { JamChatDrawer } from './JamChatDrawer';

const hostProvider = { value: insets59 };

// Test-only knobs for renderDrawer, kept apart from the component's props
// so the helper can never forward one of them into the tree.
interface RenderDrawerOptions {
  readOnly?: boolean;
  os?: 'ios' | 'android';
  wrapInHostProvider?: boolean;
}

const renderDrawer = (props: RenderDrawerOptions = {}) => {
  // Tests pass the OS through the helper rather than mutating platformState
  // themselves, so per-test setup stays isolated (afterEach still resets it).
  // Only drawerProps reaches the component element; os and
  // wrapInHostProvider are destructured out, so neither can leak onto
  // JamChatDrawer as a foreign prop.
  const { os = 'ios', wrapInHostProvider = true, ...drawerProps } = props;
  platformState.os = os;
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    const drawer = React.createElement(JamChatDrawer, {
      open: true,
      onClose: jest.fn(),
      ...drawerProps,
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

// The KAV contract that must hold on every platform/provider variant:
// 'padding' lift, the safe-area-top offset (the KAV's parent screen-Y), and
// avoidance not disabled. Call it from each variant test so the contract
// lives in one place; the test keeps its own comment for the variant's
// distinguishing assertion.
const expectKavContract = (kav: { props: MockElementProps }) => {
  expect(kav.props.behavior).toBe('padding');
  expect(kav.props.keyboardVerticalOffset).toBe(59);
  expect(kav.props.enabled).not.toBe(false);
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
    // The prop is absent (RN defaults enabled to true); the contract pins
    // the axis so a regression that re-gates the KAV to iOS-only fails
    // here, not just on the behavior assertion.
    expectKavContract(tree.root.findByType('KeyboardAvoidingView'));
  });

  it('avoids the keyboard on Android with the padding behavior (host-independent)', () => {
    const tree = renderDrawer({ os: 'android' });
    // Avoidance is the component's own job on Android, not the host app's
    // windowSoftInputMode: 'padding' shrinks the drawer by the measured
    // keyboard overlap, so the newest message and composer stay visible
    // regardless of the host's soft-input mode. The enabled axis is pinned
    // on Android too (in the contract) — without it, a regression that
    // re-adds enabled={isIos} while keeping behavior 'padding' would pass
    // every test here while reintroducing exactly the QA-reported bug (a
    // disabled KAV is a no-op regardless of behavior).
    expectKavContract(tree.root.findByType('KeyboardAvoidingView'));
    // Cross-platform re-pin contract: Android subscribes too, so the newest
    // message settles above the composer after the padding reflow.
    expect(keyboardState.listeners).toHaveLength(1);
  });

  it('re-pins the newest message on Android when the keyboard shows', () => {
    renderDrawer({ os: 'android' });
    // The Android re-pin is the changed behavior in this fix, so it is
    // asserted behaviorally (listener fired) rather than by subscription
    // count alone — the cross-platform contract is the same as iOS: fire
    // the keyboardDidShow subscriber the way the platform would and the
    // newest message settles above the composer after the padding reflow.
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

  it('renders without a host SafeAreaProvider instead of throwing', () => {
    // No provider above: the context is null. If the drawer read the hook
    // instead of the context, this render throws (real 5.8.0 semantics).
    const tree = renderDrawer({ wrapInHostProvider: false });
    expect(throwingUseSafeAreaInsets).not.toHaveBeenCalled();
    // The drawer serves its own provider, so the offset still resolves —
    // the self-provided provider does not change the avoidance contract.
    expect(tree.root.findByType('SafeAreaProvider')).toBeDefined();
    expectKavContract(tree.root.findByType('KeyboardAvoidingView'));
  });

  it('keeps the host provider authoritative (no nested provider)', () => {
    const tree = renderDrawer();
    expect(tree.root.findAllByType('SafeAreaProvider')).toHaveLength(0);
    expectKavContract(tree.root.findByType('KeyboardAvoidingView'));
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
