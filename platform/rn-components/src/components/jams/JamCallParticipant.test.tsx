/**
 * Wiring test for the camera tile: the `VideoTrack` in `JamCallParticipant`
 * is keyed by the late-track `remountKey`, so when a first mid-Jam remote
 * camera publish delivers its video track late, the native view remounts and
 * re-runs its one-shot `streamURL` attach (one transition remount plus the
 * hook's retry schedule — tight burst first, then the sparse tail).
 *
 * The real `JamCallParticipant` and the real `useLateTrackMediaStream` run;
 * only the module surfaces the test cannot load under jest are stubbed
 * (react-native, `@livekit/react-native` with a mount-counting `VideoTrack`,
 * `@openpeepshq/react`, i18n, toast, `react-native-sound`, icons, dropdown/
 * button UI, connection and theme hooks, avatar). The `.wav` asset in the
 * overlay needs an explicit mock because jest cannot require audio files.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

// Counts how many times the stub VideoTrack actually mounts. A key change
// unmounts the old instance and mounts a new one, so this is a direct count
// of the tile's VideoTrack remounts (the `key` prop is consumed by the
// reconciler and is not visible to the stub).
let videoTrackMountCount = 0;

jest.mock('react-native-sound', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    setVolume: jest.fn(),
    play: jest.fn(),
    release: jest.fn(),
  })),
}));

jest.mock(
  '../../assets/audio/click-notification.wav',
  () => 'click-notification.wav',
  { virtual: true }
);

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Pressable: (props: {
    accessibilityLabel?: string;
    onPress?: () => void;
    children?: unknown;
  }) =>
    React.createElement(
      'Pressable',
      {
        accessibilityLabel: props.accessibilityLabel,
        onPress: props.onPress,
      },
      props.children
    ),
  StyleSheet: {
    absoluteFill: { position: 'absolute', inset: 0 },
    create: (o: Record<string, unknown>) => o,
  },
  View: (props: { style?: unknown; className?: string; children?: unknown }) =>
    React.createElement('View', null, props.children),
}));

jest.mock('@livekit/react-native', () => ({
  VideoTrack: ({
    trackRef,
    mirror,
  }: {
    trackRef: { publication: { trackSid: string } };
    mirror: boolean;
  }) => {
    const { useEffect } = require('react');
    useEffect(() => {
      videoTrackMountCount++;
    }, []);
    return React.createElement('VideoTrack', {
      mirror,
      trackSid: trackRef.publication.trackSid,
    });
  },
  isTrackReference: (ref: { publication?: unknown }) => !!ref.publication,
  useIsSpeaking: () => false,
  useRoomContext: () => ({ localParticipant: {} }),
}));

jest.mock('@openpeepshq/react', () => ({
  useCurrentProfile: () => null,
  participantTileProfile: () => null,
  useJamContext: () => ({ jam: { moderators: [] } }),
  useJamEventsContext: () => ({
    ownReactions: [],
    reactionsForParticipant: () => [],
  }),
  useJamParticipantMute: () => jest.fn(),
  useJamParticipantRemove: () => jest.fn(),
  useRaisedHands: () => new Set(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      String(key).replace(/\{\{(\w+)\}\}/g, (_m: string, n: string) =>
        String(opts?.[n] ?? '')
      ),
  }),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('../icons/index', () => {
  const icon = (name: string) => () => React.createElement(name);
  return {
    AudioLinesIcon: icon('AudioLinesIcon'),
    BanIcon: icon('BanIcon'),
    EllipsisIcon: icon('EllipsisIcon'),
    HandIcon: icon('HandIcon'),
    MicIcon: icon('MicIcon'),
    MicOffIcon: icon('MicOffIcon'),
    PinIcon: icon('PinIcon'),
    WifiOffIcon: icon('WifiOffIcon'),
  };
});

jest.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: (props: { children?: unknown }) =>
    React.createElement('DropdownMenu', null, props.children),
  DropdownMenuContent: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuContent', null, props.children),
  DropdownMenuGroup: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuGroup', null, props.children),
  DropdownMenuItem: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuItem', null, props.children),
  DropdownMenuTrigger: (props: { children?: unknown }) =>
    React.createElement('DropdownMenuTrigger', null, props.children),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown; className?: string }) =>
    React.createElement(
      'ThemedText',
      { className: props.className },
      props.children
    ),
}));

jest.mock('../ui/button', () => ({
  Button: (props: { children?: unknown; accessibilityLabel?: string }) =>
    React.createElement(
      'Button',
      { accessibilityLabel: props.accessibilityLabel },
      props.children
    ),
}));

jest.mock('../../lib/utils', () => ({
  cn: (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' '),
}));

jest.mock('../profile/Avatar', () => ({
  ProfileAvatar: () => React.createElement('ProfileAvatar'),
}));

jest.mock('./useParticipantConnection', () => ({
  useConnectionLost: () => false,
}));

jest.mock('../../theme/useThemeOpacity', () => ({
  useThemeOpacity: () => ({
    background: () => ({ backgroundColor: 'rgba(0, 0, 0, 0.7)' }),
  }),
}));

const { JamCallParticipant } = require('./JamCallParticipant');

// Minimal stand-in for the webrtc MediaStream surface the hook touches.
const makeMediaStream = (initialVideoTracks = 0) => {
  const videoTracks: unknown[] = Array.from({ length: initialVideoTracks });
  const listeners: Array<() => void> = [];
  return {
    getVideoTracks: () => videoTracks,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.push(listener),
    removeEventListener: (_type: string, listener: () => void) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    },
    // Test helper, not part of the real MediaStream API.
    addVideoTrack() {
      videoTracks.push({});
      listeners.forEach((listener) => listener());
    },
  };
};

type Stream = ReturnType<typeof makeMediaStream>;

const renderTile = (track: { mediaStream?: Stream }) => {
  videoTrackMountCount = 0;
  const publication = {
    trackSid: 'track-1',
    isMuted: false,
    track: track as never,
  };
  const trackRef = {
    participant: {
      identity: 'remote',
      isLocal: false,
      isMicrophoneEnabled: true,
      connectionQuality: 1, // ConnectionQuality.Good
    },
    publication,
  } as never;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(JamCallParticipant, {
        trackRef,
        size: 'size-full',
      })
    );
  });
  return {
    tree,
    mounts: () => videoTrackMountCount,
    unmount() {
      ReactTestRenderer.act(() => {
        tree.unmount();
      });
    },
  };
};

describe('JamCallParticipant camera tile wiring', () => {
  it('remounts the VideoTrack when the stream gains its first video track, plus a bounded burst, then stops', () => {
    jest.useFakeTimers();
    try {
      const stream = makeMediaStream(0);
      const tile = renderTile({ mediaStream: stream });

      // Two mounts at initial render: the tile renders once, then the #1903
      // trackEpoch effect bumps once on mount, re-keying the VideoTrack.
      expect(tile.mounts()).toBe(2);

      // First-track transition: one remount (remountKey 0 → 1)...
      ReactTestRenderer.act(() => {
        stream.addVideoTrack();
      });
      expect(tile.mounts()).toBe(3);

      // ...then the hook's bounded burst: one remount per 300 ms tick, so
      // keep the commits separate by advancing one tick per act().
      ReactTestRenderer.act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(tile.mounts()).toBe(4);
      ReactTestRenderer.act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(tile.mounts()).toBe(5);
      ReactTestRenderer.act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(tile.mounts()).toBe(6);

      // The tight burst is bounded: the fourth tick (1200 ms) clears the
      // interval, and nothing further remounts up to the tail's first tick
      // (3200 ms) — advance just before it. The tail's remounts at 2 s
      // intervals are covered by the hook's own suite
      // (`useLateTrackMediaStream.test.ts`, "sparse backoff tail"); a camera
      // publish mid-Jam does not renegotiate, so it stays within the burst
      // window.
      ReactTestRenderer.act(() => {
        jest.advanceTimersByTime(1900);
      });
      expect(tile.mounts()).toBe(6);
      tile.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not burst when the stream already has its track at mount', () => {
    jest.useFakeTimers();
    try {
      const tile = renderTile({ mediaStream: makeMediaStream(1) });

      // The two initial mounts come from the trackEpoch mount bump only.
      expect(tile.mounts()).toBe(2);

      // No 0 → 1 transition ever happens: no late remounts at all.
      ReactTestRenderer.act(() => {
        jest.advanceTimersByTime(300 * 20);
      });
      expect(tile.mounts()).toBe(2);
      tile.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});
