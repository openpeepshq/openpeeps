import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { RenderFunction } from 'react-native-markdown-display';
import {
  extractIframeSrcs,
  MARKDOWN_HTML_ALLOWED_TAGS,
} from '@openpeepshq/common/lib';

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

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
        {iframes.map((src, i) => (
          <View key={`${i}-${src.slice(0, 20)}`} style={styles.iframeRow}>
            <WebView
              source={{ uri: src }}
              style={styles.webview}
              scrollEnabled={false}
              onNavigationStateChange={(nav) => {
                // Intercept navigations away from the original embed URL
                // and open them in the system browser instead.
                if (nav.url !== src) {
                  onIframePress(nav.url);
                }
              }}
            />
            <Text style={styles.iframeUrl} onPress={() => onIframePress(src)}>
              {src}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // Strip all HTML tags — only allowlisted tags are permitted on the web
  // (via DOMPurify). On RN we render safe tags as text and drop the rest.
  const allowed = new Set<string>(MARKDOWN_HTML_ALLOWED_TAGS);
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(raw)) !== null) {
    tags.push(match[1]?.toLowerCase());
  }

  // If all tags are allowlisted, strip them and render as text.
  const text = raw.replace(TAG_RE, '');
  if (tags.every((tag) => !tag || allowed.has(tag.toLowerCase()))) {
    return <Text style={styles.text}>{text}</Text>;
  }

  // Disallowed tags present — strip everything to plain text.
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
