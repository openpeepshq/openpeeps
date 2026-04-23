import React from 'react';
import { Text, View } from 'react-native';
import type { RenderFunction } from 'react-native-markdown-display';

/**
 * Custom renderer for inline code that properly applies padding
 * Uses View wrapper for padding support, with proper baseline alignment
 */
export const codeInlineRenderer = (colors: {
  muted: string;
  foreground: string;
}): RenderFunction => (node, _children, _parent, styles) => {
  const rec =
    styles && typeof styles === 'object' ? (styles as Record<string, object>) : {};
  const codeInlineStyle: Record<string, unknown> =
    'code_inline' in rec && rec.code_inline && typeof rec.code_inline === 'object'
      ? (rec.code_inline as Record<string, unknown>)
      : {};
  const paragraphStyle: Record<string, unknown> =
    'paragraph' in rec && rec.paragraph && typeof rec.paragraph === 'object'
      ? (rec.paragraph as Record<string, unknown>)
      : {};

  const padding = (codeInlineStyle.padding as number | undefined) || 4;

  const content =
    typeof node.content === 'string' ? node.content : String(node.content);

  const paragraphFontSize = (paragraphStyle.fontSize as number | undefined) || 16;
  const codeFontSize = (codeInlineStyle.fontSize as number | undefined) || paragraphFontSize;

  return (
    <View
      key={node.key}
      style={{
        backgroundColor:
          (codeInlineStyle.backgroundColor as string | undefined) || colors.muted,
        paddingHorizontal: padding,
        paddingVertical: 0,
        borderRadius: (codeInlineStyle.borderRadius as number | undefined) || 4,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'baseline',
        transform: [{ translateY: 4 }],
      }}>
      <Text
        style={{
          color: (codeInlineStyle.color as string | undefined) || colors.foreground,
          fontFamily: (codeInlineStyle.fontFamily as string | undefined) || 'monospace',
          fontSize: codeFontSize,
          lineHeight: codeFontSize,
          includeFontPadding: false,
        }}>
        {content}
      </Text>
    </View>
  );
};
