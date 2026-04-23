import React from 'react';
import {
  type MarkdownIt,
  type RenderFunction,
} from 'react-native-markdown-display';
import { hashtagRegex } from '@openpeeps/common';
import { ThemedText } from '../../../ui/themed-text';
import type { MarkdownInlineRulerState } from '../../../../types/markdown-plugin';

/**
 * MarkdownIt plugin to create tokens for hashtags
 *
 * This plugin parses hashtags like #example and creates tokens
 * that can be rendered as custom components.
 */
export const hashtagPlugin = (md: MarkdownIt): void => {
  // Register inline rule for hashtags
  md.inline.ruler.before(
    'text',
    'hashtag',
    (state: MarkdownInlineRulerState, silent: boolean) => {
      const pos = state.pos;

      // Use hashtagRegex to match from current position
      // The regex already includes word boundary checks via (?<!\\S) and (?!\\S)
      hashtagRegex.lastIndex = 0;
      const remainingText = state.src.slice(pos);
      const match = hashtagRegex.exec(remainingText);

      if (!match || match.index !== 0) {
        return false;
      }

      // Extract the tag from the match (group 1 contains the tag without #)
      const tag = match[1];
      const fullMatch = match[0];
      const end = pos + fullMatch.length;

      if (!silent) {
        const token = state.push('hashtag', '', 0);
        token.content = tag;
        token.markup = '#';
        token.info = fullMatch;
      }

      state.pos = end;
      return true;
    },
  );
};

/**
 * Renderer function for hashtag tokens
 */
export const hashtagRenderer = (
  handleLinkPress: (url: string) => void,
  primaryColor: string,
): RenderFunction => (node, _children, _parentNodes, styles) => {
  const tag = node.content || '';
  const url = `goto:/#${tag}`;
  const rec =
    styles && typeof styles === 'object' ? (styles as Record<string, object>) : {};
  const linkStyle: object = 'link' in rec && rec.link ? rec.link : {};
  return (
    <ThemedText
      key={node.key}
      style={[linkStyle, { color: primaryColor }]}
      onPress={() => handleLinkPress(url)}>
      #{tag}
    </ThemedText>
  );
};
