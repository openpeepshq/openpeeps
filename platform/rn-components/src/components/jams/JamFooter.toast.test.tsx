/**
 * Regression tests for the waiting-room join toast on the native surface.
 *
 * The shared hook (useJamFooterControls) fires `showToast` when someone joins;
 * the only code that turns that into a user-visible toast lives here in the
 * native footer — `useThemedToastConfig` (which must expose an `info` entry
 * built from the theme palette, else a missing/wrong `type` would render an
 * unstyled default toast or nothing) and `useFooterControls().showToast`
 * (which must route to `Toast.show({ type: 'info', ... })`).
 *
 * Only react-native, livekit, i18n and the heavy footer siblings are stubbed.
 * `useThemedToastConfig` runs against the real `mapColors` so the expected hex
 * values are the ones the app actually ships. `useJamFooterControls` is stubbed
 * to echo back the args object, so `useFooterControls()` returns the real
 * `showToast` closure the footer built — exactly the code under test — without
 * loading the hook's full React dependency graph.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const { mapColors } = require('../../theme/defaults');

const toastShowMock = jest.fn();
let mockIsDark = false;

const tMock = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_m: string, n: string) =>
    String(opts?.[n] ?? '')
  );

jest.mock('react-native', () => ({
  View: (props: { style?: unknown; className?: string; children?: unknown }) =>
    React.createElement(
      'View',
      { style: props.style, className: props.className },
      props.children
    ),
  Text: (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children),
  Pressable: (props: { children?: unknown }) =>
    React.createElement('Pressable', null, props.children),
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: toastShowMock },
}));

jest.mock('@livekit/react-native', () => ({
  useRoomContext: () => ({}),
  useParticipants: () => [],
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock }),
}));

jest.mock('@openpeepshq/react', () => ({
  // Echo back the args object so useFooterControls() returns the real
  // showToast closure the footer built (the code under test).
  useJamFooterControls: (args: unknown) => args,
}));

jest.mock('../../theme/OpenPeepsThemeProvider', () => ({
  useOpenPeepsTheme: () => ({
    isDark: mockIsDark,
    colors: mapColors(mockIsDark),
    buttonRadius: '9999px',
    refresh: () => {},
  }),
}));

jest.mock('../../theme/useThemeOpacity', () => ({
  useThemeOpacity: () => ({ background: () => ({}) }),
}));

jest.mock('./JamDeviceSelectors', () => ({
  JamAudioOutputSelector: () => React.createElement('JamAudioOutputSelector'),
  JamCameraSelector: () => React.createElement('JamCameraSelector'),
  JamMicSelector: () => React.createElement('JamMicSelector'),
}));
jest.mock('./JamReactionMenu', () => ({
  JamReactionMenu: () => React.createElement('JamReactionMenu'),
}));
jest.mock('./JamToolbarButton', () => ({
  JamToolbarButton: ({ children }: { children?: unknown }) =>
    React.createElement('JamToolbarButton', null, children),
  toneIconClass: { default: '', active: '' },
}));
jest.mock('./LeaveCloseButton', () => ({
  LeaveCloseButton: () => React.createElement('LeaveCloseButton'),
}));
jest.mock('../icons/index', () => ({
  CircleEllipsisIcon: () => React.createElement('i'),
  CircleStopIcon: () => React.createElement('i'),
  DiscIcon: () => React.createElement('i'),
  HandIcon: () => React.createElement('i'),
  InfoIcon: () => React.createElement('i'),
  LaughIcon: () => React.createElement('i'),
  MessageSquareTextIcon: () => React.createElement('i'),
  UsersRoundIcon: () => React.createElement('i'),
}));
jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: {
    children?: unknown;
    className?: string;
    style?: unknown;
  }) =>
    React.createElement(
      'ThemedText',
      {
        className: props.className,
        style: props.style,
      },
      props.children
    ),
}));

const { useThemedToastConfig, useFooterControls } = require('./JamFooter');

/** Capture the value a hook returns by rendering a component that calls it. */
const captureHook = <T,>(fn: () => T): T => {
  let value!: T;
  const Capture = () => {
    value = fn();
    return null;
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(Capture as () => unknown)
    );
  });
  ReactTestRenderer.act(() => {
    tree.unmount();
  });
  return value;
};

/** Render a toast-layout element and return its root View's props. */
const renderToastBody = (
  layout: (p: { text1?: string }) => unknown,
  text1: string
) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(layout, { text1 }));
  });
  // Read props while the tree is still mounted (instances go stale after
  // unmount); do this outside the create-act, as the repo's existing
  // react-test-renderer tests do.
  const props = {
    className: tree.root.findByType('View').props.className,
    style: tree.root.findByType('View').props.style,
  };
  ReactTestRenderer.act(() => {
    tree.unmount();
  });
  return props;
};

describe('useThemedToastConfig', () => {
  it('exposes an info entry built from the theme tokens (light)', () => {
    mockIsDark = false;
    const config = captureHook(useThemedToastConfig);

    expect(config.info).toBeDefined();
    // Missing `info` from the config is the regression this pins: without it
    // `Toast.show({ type: 'info' })` would fall back to an unstyled default.
    const props = renderToastBody(
      config.info as (p: { text1?: string }) => unknown,
      '1 person joined the waiting room'
    );

    // Shipped light palette: info = card background + foreground text.
    expect(props.style).toEqual([
      expect.objectContaining({ borderWidth: 1 }),
      { backgroundColor: '#ffffff', borderColor: '#0a0a0b' },
    ]);
  });

  it('keeps success on the primary palette (distinct from info)', () => {
    mockIsDark = false;
    const config = captureHook(useThemedToastConfig);

    const props = renderToastBody(
      config.success as (p: { text1?: string }) => unknown,
      'recording saved'
    );

    // success = primary background + primary-foreground text (light).
    expect(props.style).toEqual([
      expect.objectContaining({ borderWidth: 1 }),
      { backgroundColor: '#16161a', borderColor: '#fafafa' },
    ]);
  });

  it('adapts the info palette to the dark theme', () => {
    mockIsDark = true;
    const config = captureHook(useThemedToastConfig);

    const props = renderToastBody(
      config.info as (p: { text1?: string }) => unknown,
      'someone joined'
    );

    // Shipped dark palette: card = #0a0a0f, foreground = #fafafa.
    expect(props.style).toEqual([
      expect.objectContaining({ borderWidth: 1 }),
      { backgroundColor: '#0a0a0f', borderColor: '#fafafa' },
    ]);
  });

  it('keeps error on the destructive palette (distinct from info)', () => {
    mockIsDark = false;
    const config = captureHook(useThemedToastConfig);

    const props = renderToastBody(
      config.error as (p: { text1?: string }) => unknown,
      'recording failed'
    );

    // error = destructive background + destructive-foreground text (light).
    expect(props.style).toEqual([
      expect.objectContaining({ borderWidth: 1 }),
      { backgroundColor: '#ef4444', borderColor: '#fafafa' },
    ]);
  });
});

describe('useFooterControls().showToast (native)', () => {
  it('routes a waiting-room join to Toast.show with type info', () => {
    mockIsDark = false;
    const result: { showToast: (text1: string) => void } =
      captureHook(useFooterControls);

    expect(typeof result.showToast).toBe('function');

    toastShowMock.mockClear();
    ReactTestRenderer.act(() => {
      result.showToast('2 people joined the waiting room');
    });

    expect(toastShowMock).toHaveBeenCalledTimes(1);
    expect(toastShowMock).toHaveBeenCalledWith({
      type: 'info',
      text1: '2 people joined the waiting room',
    });
  });
});
