import React from 'react';
import { Text, View } from 'react-native';
import type { RenderFunction } from 'react-native-markdown-display';

function getStyleRecord(
  styles: unknown,
  key: 'code_block' | 'code_inline' | 'paragraph',
): Record<string, unknown> {
  if (!styles || typeof styles !== 'object' || !(key in styles)) {
    return {};
  }
  const block = (styles as Record<string, unknown>)[key];
  return block && typeof block === 'object' ? (block as Record<string, unknown>) : {};
}

/**
 * Custom renderer for code blocks that properly applies padding
 */
export const codeBlockRenderer = (colors: {
  muted: string;
  foreground: string;
}): RenderFunction => (node, _children, _parent, styles) => {
  const codeBlockStyle = getStyleRecord(styles, 'code_block');

  const content = typeof node.content === 'string' ? node.content.trimEnd() : node.content;

  return (
    <View
      key={node.key}
      style={{
        backgroundColor: (codeBlockStyle.backgroundColor as string | undefined) || colors.muted,
        padding: (codeBlockStyle.padding as number | undefined) || 16,
        borderRadius: (codeBlockStyle.borderRadius as number | undefined) || 16,
      }}>
      <Text
        style={{
          color: (codeBlockStyle.color as string | undefined) || colors.foreground,
          fontFamily: (codeBlockStyle.fontFamily as string | undefined) || 'monospace',
          fontSize: (codeBlockStyle.fontSize as number | undefined) || 14,
        }}>
        {content as React.ReactNode}
      </Text>
    </View>
  );
};

/**
 * Custom renderer for fence blocks (triple backtick code blocks)
 */
export const fenceRenderer = (colors: {
  muted: string;
  foreground: string;
}): RenderFunction => (node, children, parent, styles) => {
  return codeBlockRenderer(colors)(node, children, parent, styles);
};
