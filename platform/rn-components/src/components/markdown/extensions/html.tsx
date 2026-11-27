import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { RenderFunction } from 'react-native-markdown-display';
import {
  extractIframeSrcs,
  isExternalLink,
  MARKDOWN_HTML_BLOCK_TAGS,
} from '@openpeepshq/common/lib';

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

// Built once from the shared block-tag list (module constant, matching
// TAG_RE's style) so renderHtmlContent does not rebuild the RegExp on every
// HTML token of every post render (review round-7 item 2).
const BLOCK_TAG_RE = new RegExp(
  `<\\/?(?:${MARKDOWN_HTML_BLOCK_TAGS.join('|')})(?:\\s[^>]*)?>`,
  'gi'
);

/**
 * Renderer for markdown-it `html_inline` tokens.
 * Extracts iframes (rendered as inline WebViews) and strips other HTML.
 */
export const htmlInlineRenderer =
  (onIframePress: (url: string) => void): RenderFunction =>
  (node) => {
    const raw =
      typeof node.content === 'string' ? node.content : String(node.content);
    return renderHtmlContent(raw, onIframePress);
  };

/**
 * Renderer for markdown-it `html_block` tokens.
 */
export const htmlBlockRenderer =
  (onIframePress: (url: string) => void): RenderFunction =>
  (node) => {
    const raw =
      typeof node.content === 'string' ? node.content : String(node.content);
    return renderHtmlContent(raw, onIframePress);
  };

const renderHtmlContent = (
  raw: string,
  onIframePress: (url: string) => void
): React.ReactElement | null => {
  // Iframes: render as inline WebViews so embedded content (YouTube, etc.)
  // is visible without leaving the app.
  const iframes = extractIframeSrcs(raw);
  if (iframes.length > 0) {
    return (
      <View style={styles.iframeContainer} key={raw.slice(0, 40)}>
        {iframes.map((src, i) => {
          // Compute the embed origin once so we can distinguish
          // same-origin navigations (allow) from cross-origin (intercept).
          let embedOrigin: string | undefined;
          try {
            embedOrigin = new URL(src).origin;
          } catch {
            embedOrigin = undefined;
          }
          return (
            <View key={`${i}-${src.slice(0, 20)}`} style={styles.iframeRow}>
              <WebView
                source={{ uri: src }}
                style={styles.webview}
                scrollEnabled={false}
                onShouldStartLoadWithRequest={(nav) => {
                  // Allow same-origin navigations (e.g., YouTube updating
                  // query params when play is tapped). Only intercept
                  // cross-origin navigations and open them in the browser.
                  if (embedOrigin && isExternalLink(nav.url, embedOrigin)) {
                    onIframePress(nav.url);
                    return false;
                  }
                  return true;
                }}
              />
              <Text style={styles.iframeUrl} onPress={() => onIframePress(src)}>
                {src}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  // RN renders HTML as plain text (iframes are handled above): strip all
  // tags. Block containers become line breaks so adjacent containers — e.g.
  // the two side-by-side `<div>` columns of a hand-authored layout — don't
  // run together into one orphan text run. Inline wrappers such as `<span>`
  // are *not* block containers: their tags are stripped to nothing so
  // "Hello <span>x</span> world" stays on one line. The block set is derived
  // from the shared allowlist so one list drives web, Node, and RN.
  const text = raw
    .replace(BLOCK_TAG_RE, '\n')
    .replace(TAG_RE, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  if (!text) return null;
  return <Text style={styles.text}>{text}</Text>;
};

const styles = StyleSheet.create({
  iframeContainer: { marginVertical: 8 },
  iframeRow: { flexDirection: 'column', alignItems: 'flex-start' },
  iframeUrl: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  webview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
  },
  text: { fontSize: 16, lineHeight: 24 },
});
