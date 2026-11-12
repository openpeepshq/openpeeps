/**
 * Regression test for the "poor connection" banner rendering as raw,
 * transparent text over the jam video grid (issue #1814).
 *
 * Root cause: the banner background was the NativeWind class `bg-accent/90`.
 * NativeWind v4 cannot apply a `/N` opacity modifier to a CSS-variable color
 * (`--accent`), so the class produced *no* background at all. The fix applies
 * the background through the same inline `hexWithOpacity` workaround the
 * sibling recording pill already uses.
 *
 * The View mock records the props the banner container is rendered with so the
 * test can assert the background is now a real (non-transparent) inline value.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const mockViewProps: Array<{ style?: unknown; className?: string }> = [];
let mockQuality = 1; // livekit-client ConnectionQuality.Good

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

jest.mock('../../theme/OpenPeepsThemeProvider', () => ({
  useOpenPeepsTheme: () => ({
    isDark: true,
    colors: { 'accent': '#f4f4f5', 'accent-foreground': '#fafafa' },
    buttonRadius: '9999px',
    refresh: () => {},
  }),
}));

// Mirrors platform/rn-components/src/theme/utils.ts hexWithOpacity (the built
// module pulls in `nativewind`, which this node jest env can't load).
jest.mock('../../theme/utils', () => ({
  hexWithOpacity: (hex: string, opacity: number) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const [, r, g, b] = m;
    return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${opacity})`;
  },
}));

jest.mock('./useParticipantConnection', () => ({
  useConnectionQuality: () => mockQuality,
}));

const { JamNetworkQuality } = require('./JamRoomIndicators');

const renderQuality = (quality: number) => {
  mockViewProps.length = 0;
  mockQuality = quality;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(React.createElement(JamNetworkQuality));
  });
  return { tree, banner: mockViewProps[mockViewProps.length - 1] };
};

describe('JamNetworkQuality banner background', () => {
  it('renders an opaque inline background when the connection is poor', () => {
    const { banner } = renderQuality(2); // ConnectionQuality.Poor

    expect(banner).toBeDefined();
    // The broken `bg-accent/90` class must be gone...
    expect(banner!.className).not.toContain('bg-accent/90');
    // ...and the background must now be a real inline rgba value derived from
    // the theme accent color (#f4f4f5) at 0.9 opacity — not absent/transparent.
    expect(banner!.style).toEqual({
      backgroundColor: 'rgba(244, 244, 245, 0.9)',
    });
  });

  it('also renders the opaque background when the connection is lost', () => {
    const { banner } = renderQuality(3); // ConnectionQuality.Lost
    expect(banner).toBeDefined();
    expect((banner!.style as { backgroundColor: string }).backgroundColor).toBe(
      'rgba(244, 244, 245, 0.9)'
    );
  });

  it('renders nothing when the connection is good', () => {
    renderQuality(1); // ConnectionQuality.Good
    expect(mockViewProps).toHaveLength(0);
  });
});
