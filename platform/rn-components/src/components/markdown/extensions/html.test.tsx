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
 * cover, and its `lib` barrel re-exports `tokenHelpers.ts` (jose, ESM-only),
 * so the whole barrel can't load here. The HTML policy constants, however,
 * are plain data in the import-free leaf `markdownHtmlPolicy.ts` — so the
 * mock requires the REAL constants (same source of truth html.tsx consumes
 * at runtime) instead of keeping a hand-copied list that drifts silently.
 * Only the two helpers below still need stand-ins.
 */
jest.mock('@openpeepshq/common/lib', () => {
  const realPolicy = require('../../../../../common/src/lib/markdownHtmlPolicy');
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
    MARKDOWN_HTML_ALLOWED_TAGS: realPolicy.MARKDOWN_HTML_ALLOWED_TAGS,
    MARKDOWN_HTML_BLOCK_TAGS: realPolicy.MARKDOWN_HTML_BLOCK_TAGS,
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

describe('htmlInlineRenderer plain-text fallback (no iframe)', () => {
  const renderText = (html: string) => {
    const tree = renderWithNode(jest.fn(), html);
    const texts = tree.root
      .findAll((n) => n.type === 'Text')
      .map((n) => n.props.children);
    tree.unmount();
    return texts.filter((t) => typeof t === 'string').join('\n');
  };

  it('renders two side-by-side div columns as separate lines of text', () => {
    const text = renderText(
      '<div class="col">Left column</div><div class="col">Right column</div>'
    );
    expect(text).toContain('Left column');
    expect(text).toContain('Right column');
  });

  it('flattens a table to its cell text', () => {
    const text = renderText(
      '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>value</td></tr></tbody></table>'
    );
    expect(text).toContain('Name');
    expect(text).toContain('value');
  });

  it('renders inline markup as plain text', () => {
    const text = renderText('<p>Hello <b>world</b></p>');
    expect(text).toContain('Hello');
    expect(text).toContain('world');
  });

  it('keeps an inline <span> on the same line (not a block break)', () => {
    // Regression: <span> is an inline wrapper, not a block container, so
    // "Hello <span>x</span> world" must stay on one line rather than be split
    // into three.
    const text = renderText('Hello <span>x</span> world');
    expect(text).not.toContain('\n');
    expect(text).toBe('Hello x world');
  });

  it('returns null (renders nothing) for tags-only input', () => {
    const element = htmlInlineRenderer(jest.fn())(
      {
        content: '<div></div><span></span>',
      },
      [],
      {}
    );
    expect(element).toBeNull();
  });
});

// Review round-7 item 7 (41662): pin the RN iframe trust level and the
// `extractIframeSrcs` unquoted-src behavior. The RN WebView is fed the RAW
// (unsanitized) token content, unlike the web branch (DOMPurify drops
// data:/javascript: iframe srcs). These tests make that trust-level difference
// explicit rather than silent, and pin that `extractIframeSrcs` only recognizes
// QUOTED src (an unquoted `src=data:…` is not an iframe, so the safe plain-text
// fallback is what renders).
describe('htmlInlineRenderer iframe src trust level (round-7 item 7)', () => {
  it('extractIframeSrcs returns [] for an unquoted src (falls back to text)', () => {
    // Unquoted `src=data:…` does not match the quoted-src regex, so it is not
    // treated as an iframe: with nothing else in the token, the renderer
    // returns null (no WebView, no text) rather than loading a data: document.
    const element = htmlInlineRenderer(jest.fn())(
      { content: '<iframe src=data:text/html,abc>' },
      [],
      {}
    );
    expect(element).toBeNull();
    // Whereas a QUOTED data: src IS recognized as an iframe (renders a
    // WebView) — the recognition boundary is the quote, pinned here too.
    const quoted = htmlInlineRenderer(jest.fn())(
      { content: '<iframe src="data:text/html,abc"></iframe>' },
      [],
      {}
    );
    expect(quoted).not.toBeNull();
  });

  it('documents the current trust level: a quoted data: src reaches the WebView', () => {
    // The RN renderer does not sanitize the iframe src (a pre-existing gap the
    // web branch does not share — DOMPurify drops it). Pinned so the trust-level
    // difference is explicit, not silently present. See the PR note for the
    // dedicated follow-up to drop non-http(s) iframe srcs on RN too.
    const tree = renderWithNode(
      jest.fn(),
      '<iframe src="data:text/html,abc"></iframe>'
    );
    const webView = tree.root.findByType(WebView);
    expect(webView.props.source.uri).toBe('data:text/html,abc');
    tree.unmount();
  });
});
