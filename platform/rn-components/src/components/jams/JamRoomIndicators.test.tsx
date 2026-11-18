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

const mockViewProps: Array<{ style?: unknown; className?: string }> = [];
let mockQuality = 1; // livekit-client ConnectionQuality.Good
let mockIsDark = false;
let mockSessions = 0;
let mockSafeAreaTop = 36; // a typical status-bar inset

jest.mock('react-native', () => {
  const View = (props: {
    style?: unknown;
    className?: string;
    children?: unknown;
  }) => {
    mockViewProps.push({ style: props.style, className: props.className });
    return React.createElement('View', null, props.children);
  };
  const Text = (props: { children?: unknown }) =>
    React.createElement('Text', null, props.children);
  const Pressable = (props: { children?: unknown }) =>
    React.createElement('Pressable', null, props.children);
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
    // Plural branches mirror `jams.observers.present` in en.json, so the
    // rendered text pins both the key/count usage and the plural choice.
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'jams.observers.present') {
        const count = Number(opts?.count ?? 0);
        const text =
          count === 1
            ? '{{count}} external session is connected to this jam'
            : '{{count}} external sessions are connected to this jam';
        return text.replace(/\{\{(\w+)\}\}/g, (_m: string, n: string) =>
          String(opts?.[n] ?? '')
        );
      }
      return key.replace(/\{\{(\w+)\}\}/g, (_m: string, n: string) =>
        String(opts?.[n] ?? '')
      );
    },
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useJamRecordingState: () => ({ isRecording: false }),
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
  JamObserverIndicator,
} = require('./JamRoomIndicators');

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

const renderObserverPill = (sessions: number, safeAreaTop: number) => {
  mockViewProps.length = 0;
  mockSessions = sessions;
  mockSafeAreaTop = safeAreaTop;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(JamObserverIndicator));
  });
  const texts = tree.root.findAllByType('ThemedText');
  return {
    pill: mockViewProps[mockViewProps.length - 1],
    renderedText: texts.length ? texts[0].children.join('') : null,
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

describe('JamObserverIndicator pill', () => {
  it('renders nothing when no external sessions are connected', () => {
    const { pill, renderedText } = renderObserverPill(0, 36);
    expect(pill).toBeUndefined();
    expect(renderedText).toBeNull();
  });

  it('renders the singular copy with the inline primary background and a safe-area-aware top when one session is connected', () => {
    mockIsDark = false;
    const { pill, renderedText } = renderObserverPill(1, 36);

    expect(renderedText).toBe('1 external session is connected to this jam');
    expect(pill).toBeDefined();
    // The pill background is the real primary color at 0.9 opacity (inline
    // rgba, not a NativeWind `/90` class) and clears the safe-area top
    // inset plus a 16px margin; pinned against the shipped light primary
    // (#16161a).
    expect(pill!.style).toEqual([
      { top: 52, right: 16 },
      { backgroundColor: 'rgba(22, 22, 26, 0.9)' },
    ]);
    // Positioning lives in the inline style; the magic `top-14` class must
    // not come back.
    expect(pill!.className).not.toContain('top-14');
  });

  it('renders the plural copy when two sessions are connected', () => {
    const { renderedText } = renderObserverPill(2, 0);
    expect(renderedText).toBe('2 external sessions are connected to this jam');
  });

  it('adapts the top offset to the device safe-area inset', () => {
    const { pill } = renderObserverPill(1, 59); // large status-bar inset
    expect((pill!.style as Array<{ top?: number }>)[0].top).toBe(59 + 16);
  });
});
