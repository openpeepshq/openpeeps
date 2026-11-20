/**
 * Regression test for the "poor connection" banner rendering as raw,
 * transparent text over the jam video grid (issue #1814).
 *
 * Root cause: the banner background was the NativeWind class `bg-accent/90`.
 * NativeWind v4 cannot apply a `/N` opacity modifier to a CSS-variable color
 * (`--accent`), so the class produced *no* background at all. The fix applies
 * the background through `useThemeOpacity`, which builds an inline rgba from
 * the real theme color.
 *
 * Only the React Native surface (and livekit/i18n) is stubbed. The theme hook
 * and the color math (`theme/useThemeOpacity` -> `theme/color`) run as real
 * code, fed by the real `DEFAULT_COLORS` through a mocked
 * `useOpenPeepsTheme`, so a regression in `hexWithOpacity` or in the accent
 * hex values would be caught here. The expected rgba strings are pinned
 * literals, which also pins the 6-digit-hex format the helpers require.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const { mapColors } = require('../../theme/defaults');

const mockViewProps: Array<{
  style?: unknown;
  className?: string;
  pointerEvents?: string;
}> = [];
const mockPressableProps: Array<{
  accessibilityLabel?: string;
  onPress?: () => void;
}> = [];
let mockQuality = 1; // livekit-client ConnectionQuality.Good
let mockIsDark = false;
let mockSessions = 0;
let mockSafeAreaTop = 36; // a typical status-bar inset
let mockIsRecording = false;

jest.mock('react-native', () => {
  const View = (props: {
    style?: unknown;
    className?: string;
    pointerEvents?: string;
    children?: unknown;
  }) => {
    mockViewProps.push({
      style: props.style,
      className: props.className,
      pointerEvents: props.pointerEvents,
    });
    return React.createElement('View', null, props.children);
  };
  const Text = (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children);
  const Pressable = (props: {
    accessibilityLabel?: string;
    onPress?: () => void;
    children?: unknown;
  }) => {
    mockPressableProps.push({
      accessibilityLabel: props.accessibilityLabel,
      onPress: props.onPress,
    });
    return React.createElement('Pressable', null, props.children);
  };
  return { View, Text, Pressable };
});

jest.mock('@livekit/react-native', () => ({
  useLocalParticipant: () => ({ localParticipant: {} }),
}));

jest.mock('livekit-client', () => ({
  ConnectionQuality: { Good: 1, Poor: 2, Lost: 3 },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Plural branches mirror `jams.observers.connected` in en.json, so the
    // rendered text pins both the key/count usage and the plural choice.
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'jams.observers.connected') {
        const count = Number(opts?.count ?? 0);
        const text =
          count === 1
            ? '{{count}} external observer is connected to this jam'
            : '{{count}} external observers are connected to this jam';
        return text.replace(/\{\{(\w+)\}\}/g, (_m: string, n: string) =>
          String(opts?.[n] ?? '')
        );
      }
      // The dismiss label resolves to the real shipped copy (require is used
      // in-line because the jest.mock factory is hoisted above top-level consts),
      // so a dropped `jams.observers.dismiss` key breaks the assertion below.
      if (key === 'jams.observers.dismiss') {
        return require('../../../../i18n/src/locales/en.json').jams.observers
          .dismiss;
      }
      return key.replace(/\{\{(\w+)\}\}/g, (_m: string, n: string) =>
        String(opts?.[n] ?? '')
      );
    },
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useJamRecordingState: () => ({ isRecording: mockIsRecording }),
  useJamRecordingElapsed: () => null,
  useJamExternalSessions: () => mockSessions,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: mockSafeAreaTop, bottom: 0 }),
}));
jest.mock('../icons/index', () => ({
  CircleIcon: () => React.createElement('CircleIcon'),
  EyeOnIcon: () => React.createElement('EyeOnIcon'),
  XIcon: () => React.createElement('XIcon'),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown; className?: string }) =>
    React.createElement(
      'ThemedText',
      { className: props.className },
      props.children
    ),
}));

// Real theme defaults (nativewind-free), so the assertions below are checked
// against the hex values the app actually ships.
jest.mock('../../theme/OpenPeepsThemeProvider', () => ({
  useOpenPeepsTheme: () => ({
    isDark: mockIsDark,
    colors: mapColors(mockIsDark),
    buttonRadius: '9999px',
    refresh: () => {},
  }),
}));

jest.mock('./useParticipantConnection', () => ({
  useConnectionQuality: () => mockQuality,
}));

const {
  JamNetworkQuality,
  JamObserverBanner,
  JamRecordingIndicator,
  JamsBannerStack,
} = require('./JamRoomIndicators');

// Real shipped locale, so the dismiss-copy assertion pins the value the user
// actually sees rather than the raw key path (a dropped key breaks the test).
const en = require('../../../../i18n/src/locales/en.json') as {
  jams: { observers: { dismiss: string } };
};

const renderQuality = (quality: number, isDark: boolean) => {
  mockViewProps.length = 0;
  mockQuality = quality;
  mockIsDark = isDark;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(JamNetworkQuality));
  });
  return { tree, banner: mockViewProps[mockViewProps.length - 1] };
};

const renderObserverBanner = (sessions: number, safeAreaTop: number) => {
  mockViewProps.length = 0;
  mockPressableProps.length = 0;
  mockSessions = sessions;
  mockSafeAreaTop = safeAreaTop;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(JamObserverBanner));
  });
  const texts = tree.root.findAllByType('ThemedText');
  return {
    tree,
    banner: mockViewProps[mockViewProps.length - 1],
    renderedText: texts.length ? texts[0].children.join('') : null,
    dismiss: mockPressableProps[mockPressableProps.length - 1],
  };
};

describe('JamNetworkQuality banner background', () => {
  it('renders an opaque inline background (light theme) when the connection is poor', () => {
    const { banner } = renderQuality(2, false); // ConnectionQuality.Poor

    expect(banner).toBeDefined();
    // The broken `bg-accent/90` class must be gone...
    expect(banner!.className).not.toContain('bg-accent/90');
    // ...and the background must be a real inline rgba value derived from the
    // light accent color (#f4f4f5) at 0.9 opacity — not absent/transparent.
    expect(banner!.style).toEqual({
      backgroundColor: 'rgba(244, 244, 245, 0.9)',
    });
  });

  it('renders the dark accent when the dark theme is active', () => {
    const { banner } = renderQuality(2, true);
    expect(banner).toBeDefined();
    // Dark accent is #28282e (distinct from the light accent above).
    expect((banner!.style as { backgroundColor: string }).backgroundColor).toBe(
      'rgba(40, 40, 46, 0.9)'
    );
  });

  it('also renders the opaque background when the connection is lost', () => {
    const { banner } = renderQuality(3, false); // ConnectionQuality.Lost
    expect(banner).toBeDefined();
    expect((banner!.style as { backgroundColor: string }).backgroundColor).toBe(
      'rgba(244, 244, 245, 0.9)'
    );
  });

  it('renders nothing when the connection is good', () => {
    renderQuality(1, false); // ConnectionQuality.Good
    expect(mockViewProps).toHaveLength(0);
  });
});

describe('JamObserverBanner', () => {
  it('renders nothing when no external sessions are connected', () => {
    const { banner, renderedText } = renderObserverBanner(0, 36);
    expect(banner).toBeUndefined();
    expect(renderedText).toBeNull();
  });

  it('renders the singular copy with a lower-contrast surface background when one session is connected', () => {
    mockIsDark = false;
    const { banner, renderedText } = renderObserverBanner(1, 36);

    expect(renderedText).toBe('1 external observer is connected to this jam');
    expect(banner).toBeDefined();
    // The banner background is the real surface-2 color at 0.9 opacity
    // (inline rgba, not a NativeWind `/90` class); pinned against the
    // shipped light surface-2 (#e4e4e7). The style is a plain object (the
    // component passes `style={background('surface-2', 0.9)}`, no
    // positioning array — positioning lives on the shared `JamsBannerStack`,
    // mirroring the stack-level sibling assertions below).
    expect(banner!.style).toEqual({
      backgroundColor: 'rgba(228, 228, 231, 0.9)',
    });
    expect(banner!.className).not.toContain('absolute');
    expect(banner!.className).not.toContain('top-');
    // The old high-saturation primary pill must not come back.
    expect(banner!.style).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: 'rgba(22, 22, 26, 0.9)',
        }),
      ])
    );
  });

  it('renders the plural copy when two sessions are connected', () => {
    const { renderedText } = renderObserverBanner(2, 0);
    expect(renderedText).toBe('2 external observers are connected to this jam');
  });

  it('adapts the stack top offset to the device safe-area inset and keeps the banners from positioning themselves', () => {
    mockViewProps.length = 0;
    mockPressableProps.length = 0;
    mockQuality = 2; // ConnectionQuality.Poor — both banners visible
    mockIsDark = false;
    mockSessions = 2;
    mockSafeAreaTop = 59; // large status-bar inset
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        React.createElement(
          JamsBannerStack,
          null,
          React.createElement(JamNetworkQuality),
          React.createElement(JamObserverBanner)
        )
      );
    });

    // First recorded View is the stack: it owns the safe-area top offset
    // (inset + 16px, the original `top-4` below the safe area) and the
    // edge-to-edge horizontal positioning — the banners inside it do not.
    const [stack, network, observer] = mockViewProps;
    expect(stack.style).toEqual({ top: 59 + 16 });
    expect(stack.className).toContain('left-4');
    expect(stack.className).toContain('right-4');
    expect(network.style).toEqual({
      backgroundColor: 'rgba(244, 244, 245, 0.9)',
    });
    expect(observer.style).toEqual({
      backgroundColor: 'rgba(228, 228, 231, 0.9)',
    });
    for (const banner of [network, observer]) {
      expect(banner.className).not.toContain('absolute');
      expect(banner.className).not.toContain('top-');
    }
  });

  it('keeps the recording pill top-left inside the shared stack without self-positioning', () => {
    mockViewProps.length = 0;
    mockIsRecording = true;
    mockSafeAreaTop = 36;
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        React.createElement(
          JamsBannerStack,
          null,
          React.createElement(JamRecordingIndicator)
        )
      );
    });
    mockIsRecording = false;

    // First recorded View is the stack (it owns the safe-area top offset)…
    const [stack, pill] = mockViewProps;
    expect(stack.style).toEqual({ top: 36 + 16 });
    // …and the pill keeps its deliberate top-left placement *within* the
    // stack, mirroring the web pill: `self-start` pulls it to the start edge,
    // `ml-4` insets it.
    expect(pill.className).toContain('self-start');
    expect(pill.className).toContain('ml-4');
    // It must NOT bring its own fixed/top positioning — the stack owns the top
    // offset, and a stray `absolute`/`top-*` here would break the stacking.
    expect(pill.className).not.toContain('absolute');
    expect(pill.className).not.toContain('top-');
    expect((pill.style as { top?: number }).top).toBeUndefined();
  });

  it('hides the banner for the session when the close button is pressed', () => {
    const { tree, banner, dismiss } = renderObserverBanner(1, 36);
    expect(banner).toBeDefined();
    expect(dismiss).toBeDefined();
    // The dismiss control is discoverable by the shipped locale copy, not just
    // the raw key path — this would fail if `jams.observers.dismiss` were dropped.
    expect(dismiss!.accessibilityLabel).toBe(en.jams.observers.dismiss);

    ReactTestRenderer.act(() => {
      dismiss!.onPress!();
    });
    // The sessions are still connected (mockSessions unchanged), but the
    // dismissal state lives in the banner component, so the same tree
    // renders nothing for the duration of the visit.
    expect(mockSessions).toBe(1);
    expect(tree.root.findAllByType('ThemedText')).toHaveLength(0);
  });

  it('keeps the banner hidden when the last session disconnects after dismissal', () => {
    // Dedicated auto-hide branch: the `sessions <= 0` exit condition is
    // exercised on the same instance that already dismissed (the block
    // above pins the `dismissed` flag with sessions still > 0). The count
    // dropping to zero while dismissed must not re-surface the banner —
    // mirrored on the web twin, which commits the same re-render.
    const { tree, dismiss } = renderObserverBanner(1, 36);
    expect(dismiss).toBeDefined();

    ReactTestRenderer.act(() => {
      dismiss!.onPress!();
    });

    // The last session disconnects while the banner is already dismissed.
    // `tree.update` re-renders the *same* component instance (the `dismissed`
    // state is preserved), matching the web twin's post-dismiss `rerender`.
    mockSessions = 0;
    ReactTestRenderer.act(() => {
      tree.update(React.createElement(JamObserverBanner));
    });
    expect(mockSessions).toBe(0);
    expect(tree.root.findAllByType('ThemedText')).toHaveLength(0);
  });
});
