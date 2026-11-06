/**
 * Tests for the RemotePreviewLink click-to-load behavior and the WebView
 * navigation guard.
 *
 * The player (WebView) must not mount until the user taps the card, and
 * sub-frame loads inside the player must not be hijacked into the system
 * browser (players spawn cross-origin child frames on iOS).
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

jest.mock('react-native', () => {
  const View = ({ children }: { children?: unknown }) =>
    React.createElement('View', null, children);
  const Text = ({ children }: { children?: unknown }) =>
    React.createElement('Text', null, children);
  const TouchableOpacity = (props: {
    children?: unknown;
    onPress?: () => void;
  }) =>
    React.createElement(
      'TouchableOpacity',
      { testID: 'pressable', ...props },
      props.children
    );
  const ActivityIndicator = () => React.createElement('ActivityIndicator');
  const Linking = { openURL: jest.fn() };
  const StyleSheet = { create: (s: unknown) => s };
  return {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    StyleSheet,
  };
});

// The built common package ships ESM which Jest's node transform doesn't
// cover, so mirror the two helpers the component needs (same approach as
// html.test.tsx). videoEmbedForUrl must stay in sync with
// platform/common/src/lib/videoEmbed.ts.
jest.mock('@openpeepshq/common/lib', () => {
  const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,15}$/;
  const VIMEO_ID_RE = /^\d{6,}$/;
  const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';
  const VIMEO_ORIGIN = 'https://player.vimeo.com';

  const parseYouTubeStart = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const compact = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (compact) {
      const [, hours, minutes, seconds] = compact;
      if (!hours && !minutes && !seconds) return undefined;
      return (
        Number(hours ?? 0) * 3600 +
        Number(minutes ?? 0) * 60 +
        Number(seconds ?? 0)
      );
    }
    const parts = trimmed.split(':');
    if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
      return undefined;
    }
    return parts.reduce((total, part) => total * 60 + Number(part), 0);
  };

  const videoEmbedForUrl = (
    url: string
  ):
    | {
        provider: string;
        embedUrl: string;
        origin: string;
      }
    | undefined => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return undefined;
    }
    const host = parsed.hostname.replace(/^(www|m)\./, '');

    const youtubeEmbed = (id: string) => {
      const rawStart =
        parsed.searchParams.get('t') ?? parsed.searchParams.get('start');
      const start = rawStart ? parseYouTubeStart(rawStart) : undefined;
      return {
        provider: 'youtube',
        embedUrl:
          `${YOUTUBE_ORIGIN}/embed/${id}` +
          (start !== undefined && start > 0 ? `?start=${start}` : ''),
        origin: YOUTUBE_ORIGIN,
      };
    };

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/')[1] ?? '';
      return YOUTUBE_ID_RE.test(id) ? youtubeEmbed(id) : undefined;
    }

    if (host === 'youtube.com') {
      const segments = parsed.pathname.split('/').filter(Boolean);
      let id: string | undefined;
      if (segments[0] === 'watch') {
        id = parsed.searchParams.get('v') ?? undefined;
      } else if (segments[0] === 'shorts' || segments[0] === 'embed') {
        id = segments[1];
      }
      return id && YOUTUBE_ID_RE.test(id) ? youtubeEmbed(id) : undefined;
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const segments = parsed.pathname.split('/').filter(Boolean);
      let id: string | undefined;
      let hash: string | undefined;
      if (host === 'player.vimeo.com') {
        if (segments[0] === 'video') {
          id = segments[1];
          hash = parsed.searchParams.get('h') ?? undefined;
        }
      } else if (segments.length === 1) {
        id = segments[0];
      } else if (segments.length === 2 && VIMEO_ID_RE.test(segments[0])) {
        id = segments[0];
        hash = segments[1];
      } else if (segments.length === 3 && segments[0] === 'channels') {
        id = segments[2];
      } else if (
        segments.length === 4 &&
        segments[0] === 'groups' &&
        segments[2] === 'videos'
      ) {
        id = segments[3];
      }
      if (!id || !VIMEO_ID_RE.test(id)) return undefined;
      return {
        provider: 'vimeo',
        embedUrl:
          `${VIMEO_ORIGIN}/video/${id}?dnt=1` + (hash ? `&h=${hash}` : ''),
        origin: VIMEO_ORIGIN,
      };
    }

    return undefined;
  };

  return {
    videoEmbedForUrl,
    isExternalLink: (href: string, origin?: string): boolean => {
      if (!href || /^(mailto:|tel:|#)/.test(href)) return false;
      if (href.startsWith('/') && !href.startsWith('//')) return false;
      if (!origin) return !href.startsWith('/');
      try {
        return new URL(href, origin).origin !== origin;
      } catch {
        return !href.startsWith('/');
      }
    },
  };
});

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePreviewLink: () => mockPreviewState,
    },
  }),
  recordOutboundClick: jest.fn(),
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: unknown) => React.createElement('Text', props),
}));

jest.mock('../custom/common/index', () => ({
  CachedImage: () =>
    React.createElement('CachedImage', { testID: 'cached-image' }),
}));

jest.mock('../post/VideoPlayOverlay', () => ({
  VideoPlayOverlay: ({ video }: { video: boolean }) =>
    video ? React.createElement('View', { testID: 'play-overlay' }) : null,
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  class WebView extends React.Component {
    render() {
      return React.createElement(View, { testID: 'webview-mock' });
    }
  }
  return { WebView };
});

const { Linking } = require('react-native');
const { recordOutboundClick } = require('@openpeepshq/react');
const { WebView } = require('react-native-webview');
const { RemotePreviewLink } = require('./RemotePreviewLink');

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const YOUTUBE_EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

let mockPreviewState: {
  data?: { data?: { title?: string; description?: string; image?: string } };
  isLoading: boolean;
  isError: boolean;
};

const render = (url: string) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(RemotePreviewLink, { url })
    );
  });
  return tree;
};

describe('RemotePreviewLink', () => {
  beforeEach(() => {
    mockPreviewState = {
      // apiHook shape: result.data is the envelope, result.data.data the
      // payload (same as the web component's previewQuery.data?.data).
      data: {
        data: {
          title: 'Test video',
          description: 'A test video',
          image: 'https://example.com/thumb.jpg',
        },
      },
      isLoading: false,
      isError: false,
    };
    Linking.openURL.mockClear();
    recordOutboundClick.mockClear();
  });

  it('renders the link card for non-video URLs without a WebView', () => {
    const tree = render('https://example.com/article');
    expect(tree.root.findAllByType(WebView)).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'play-overlay' })).toHaveLength(
      0
    );
    expect(tree.root.findAllByProps({ testID: 'cached-image' })).toHaveLength(
      1
    );
    tree.unmount();
  });

  it('opens the URL in the browser when a non-video card is pressed', () => {
    const tree = render('https://example.com/article');
    const pressable = tree.root.findByProps({ testID: 'pressable' });
    ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/article');
    expect(recordOutboundClick).toHaveBeenCalledWith(
      'https://example.com/article'
    );
    tree.unmount();
  });

  it('shows the card with a play overlay for video URLs and no WebView', () => {
    const tree = render(YOUTUBE_URL);
    expect(tree.root.findAllByType(WebView)).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'play-overlay' })).toHaveLength(
      1
    );
    const texts = tree.root
      .findAllByType('Text')
      .map((node: { props: { children?: unknown } }) => node.props.children);
    expect(texts).toContain('Test video');
    tree.unmount();
  });

  it('mounts the WebView only after the card is pressed', () => {
    const tree = render(YOUTUBE_URL);
    const pressable = tree.root.findByProps({ testID: 'pressable' });
    ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });
    const webView = tree.root.findByType(WebView);
    expect(webView.props.source.uri).toBe(YOUTUBE_EMBED);
    tree.unmount();
  });

  describe('WebView navigation guard', () => {
    const mountedHandler = () => {
      const tree = render(YOUTUBE_URL);
      const pressable = tree.root.findByProps({ testID: 'pressable' });
      ReactTestRenderer.act(() => {
        pressable.props.onPress();
      });
      const handler =
        tree.root.findByType(WebView).props.onShouldStartLoadWithRequest;
      return { tree, handler };
    };

    it('lets sub-frame loads stay in the WebView', () => {
      const { tree, handler } = mountedHandler();
      expect(
        handler({
          url: 'https://ads.example.com/track',
          isTopFrame: false,
          navigationType: 'other',
        })
      ).toBe(true);
      expect(Linking.openURL).not.toHaveBeenCalled();
      tree.unmount();
    });

    it('lets non-click top-frame navigations stay in the WebView', () => {
      const { tree, handler } = mountedHandler();
      expect(
        handler({
          url: `${YOUTUBE_EMBED}?autoplay=1`,
          isTopFrame: true,
          navigationType: 'other',
        })
      ).toBe(true);
      expect(Linking.openURL).not.toHaveBeenCalled();
      tree.unmount();
    });

    it('keeps same-origin top-frame clicks in the WebView', () => {
      const { tree, handler } = mountedHandler();
      expect(
        handler({
          url: 'https://www.youtube-nocookie.com/embed/other',
          isTopFrame: true,
          navigationType: 'click',
        })
      ).toBe(true);
      expect(Linking.openURL).not.toHaveBeenCalled();
      tree.unmount();
    });

    it('opens external top-frame clicks in the browser', () => {
      const { tree, handler } = mountedHandler();
      expect(
        handler({
          url: 'https://twitter.com/home',
          isTopFrame: true,
          navigationType: 'click',
        })
      ).toBe(false);
      expect(Linking.openURL).toHaveBeenCalledWith('https://twitter.com/home');
      tree.unmount();
    });
  });
});
