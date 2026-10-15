/**
 * Tests for iframe WebView navigation interception.
 *
 * Regression guard for the bug where ANY url change inside an embedded
 * iframe (e.g. YouTube updating query params when play is tapped) was
 * treated as a cross-origin navigation and opened the system browser.
 *
 * The fix compares origins (via isExternalLink) instead of the full URL,
 * so same-origin navigations stay in the WebView and only genuinely
 * external clicks are intercepted.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

/**
 * React & RN are not available in the node test environment, so we provide
 * minimal stand-ins for the primitives that html.tsx touches.
 */
jest.mock('react-native', () => {
  const View = ({ children }: { children?: unknown }) =>
    React.createElement('View', null, children);
  const Text = ({ children }: { children?: unknown }) =>
    React.createElement('Text', null, children);
  const StyleSheet = { create: (s: unknown) => s };
  return { View, Text, StyleSheet };
});

/**
 * The built common package ships ESM which Jest's node transform doesn't
 * cover.  Mock the two helpers html.tsx needs with the real implementations
 * (mirrored from markdownHelpers.ts) so the integration test is accurate.
 */
jest.mock('@openpeepshq/common/lib', () => {
  const IFRAME_SRC_RE =
    /<iframe\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>/gi;

  return {
    extractIframeSrcs: (html: string): string[] => {
      const srcs: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = IFRAME_SRC_RE.exec(html)) !== null) {
        srcs.push(match[1] ?? match[2] ?? '');
      }
      return srcs;
    },
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
    MARKDOWN_HTML_ALLOWED_TAGS: [
      'a',
      'b',
      'blockquote',
      'br',
      'code',
      'em',
      'hr',
      'img',
      'iframe',
      'li',
      'ol',
      'p',
      'pre',
      'strong',
      'ul',
      'video',
      'source',
    ],
  };
});

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  class WebView extends React.Component {
    render() {
      return React.createElement(View, { testID: 'webview-mock' });
    }
  }
  WebView.navigation = { whitelist: [], blacklist: [] };
  return { WebView };
});

const { WebView } = require('react-native-webview');
const { htmlInlineRenderer } = require('./html');

const YOUTUBE_EMBED = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

const renderWithNode = (onIframePress: jest.Mock, iframeHtml: string) => {
  const fn = htmlInlineRenderer(onIframePress);
  // RenderFunction signature: (node, childrenList, ...rest)
  const node = { content: iframeHtml };
  const element = fn(node, [], {});
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(React.Fragment, null, element)
    );
  });
  return tree;
};

describe('htmlInlineRenderer iframe navigation guard', () => {
  it('allows same-origin navigations and does not open the browser', () => {
    const onIframePress = jest.fn();
    const tree = renderWithNode(
      onIframePress,
      `<iframe src="${YOUTUBE_EMBED}"></iframe>`
    );

    const webView = tree.root.findByType(WebView);
    const handler = webView.props.onShouldStartLoadWithRequest;
    expect(handler).toBeDefined();

    const sameOriginUrls = [
      `${YOUTUBE_EMBED}?autoplay=1`,
      `${YOUTUBE_EMBED}?autoplay=1&start=30`,
      'https://www.youtube.com/embed/another_video',
    ];

    for (const url of sameOriginUrls) {
      const result = handler({ url });
      expect(result).toBe(true);
      expect(onIframePress).not.toHaveBeenCalled();
    }

    tree.unmount();
  });

  it('intercepts cross-origin navigations and opens them in the browser', () => {
    const onIframePress = jest.fn();
    const tree = renderWithNode(
      onIframePress,
      `<iframe src="${YOUTUBE_EMBED}"></iframe>`
    );

    const webView = tree.root.findByType(WebView);
    const handler = webView.props.onShouldStartLoadWithRequest;

    const result = handler({ url: 'https://twitter.com/home' });

    expect(result).toBe(false);
    expect(onIframePress).toHaveBeenCalledWith('https://twitter.com/home');

    tree.unmount();
  });

  it('allows all navigations when the embed src origin cannot be determined', () => {
    const onIframePress = jest.fn();
    const tree = renderWithNode(
      onIframePress,
      '<iframe src="not-a-valid-url"></iframe>'
    );

    const webView = tree.root.findByType(WebView);
    const handler = webView.props.onShouldStartLoadWithRequest;

    const result = handler({ url: 'https://twitter.com/home' });

    // Can't determine embed origin — be permissive, don't intercept.
    expect(result).toBe(true);
    expect(onIframePress).not.toHaveBeenCalled();

    tree.unmount();
  });
});
