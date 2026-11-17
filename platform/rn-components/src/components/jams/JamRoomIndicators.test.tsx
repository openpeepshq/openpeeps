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
    t: (key: string, opts?: Record<string, unknown>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_m: string, n: string) =>
        String(opts?.[n] ?? '')
      ),
  }),
}));

jest.mock('@openpeepshq/react', () => ({
  useJamRecordingState: () => ({ isRecording: false }),
  useJamRecordingElapsed: () => null,
}));

jest.mock('../icons/index', () => ({
  CircleIcon: () => React.createElement('CircleIcon'),
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

const { JamNetworkQuality } = require('./JamRoomIndicators');

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
