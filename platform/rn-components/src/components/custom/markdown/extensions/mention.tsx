import React from 'react';
import {
  type MarkdownIt,
  type RenderFunction,
} from 'react-native-markdown-display';
import { handleRegexBase } from '@openpeepshq/common';
import { type MentionProfileRef } from '@openpeepshq/common/lib';
import { ThemedText } from '~/components/ui/themed-text';
import type { MarkdownInlineRulerState } from '~/types/markdown-plugin';

/**
 * Creates a MarkdownIt plugin to create tokens for mentions
 */
export const mentionPlugin =
  (mentions: MentionProfileRef[] = []) =>
  (md: MarkdownIt): void => {
    const mentionRegex = new RegExp(
      `^@(${handleRegexBase})(?=\\s|$|[.,!?;:])`,
      'i'
    );

    md.inline.ruler.before(
      'text',
      'mention',
      (state: MarkdownInlineRulerState, silent: boolean) => {
        const pos = state.pos;
        const prev = pos === 0 ? '' : state.src[pos - 1];
        if (prev && !/[\s(>]/.test(prev)) {
          return false;
        }

        mentionRegex.lastIndex = 0;
        const match = mentionRegex.exec(state.src.slice(pos));

        if (!match) {
          return false;
        }

        const handle = match[1];
        const fullMatch = match[0];
        const end = pos + fullMatch.length;

        const mention = mentions.find((m) => m.profile.handle === handle);

        if (!silent) {
          const token = state.push('mention', '', 0);
          token.content = handle;
          token.markup = '@';
          token.info = fullMatch;
          if (mention) {
            token.meta = {
              displayName: mention.profile.displayName,
              handle: mention.profile.handle,
            };
          }
        }

        state.pos = end;
        return true;
      }
    );
  };

/**
 * Renderer function for mention tokens
 */
export const mentionRenderer =
  (
    handleLinkPress: (url: string) => void,
    primaryColor: string,
    mentions: MentionProfileRef[] = []
  ): RenderFunction =>
  (node, _children, _parentNodes, styles) => {
    const handle = node.content || '';
    const mention = mentions.find((m) => m.profile.handle === handle);
    const displayName = mention?.profile.displayName;
    const url = `goto:/@${handle}`;
    const rec =
      styles && typeof styles === 'object'
        ? (styles as Record<string, object>)
        : {};
    const linkStyle: object = 'link' in rec && rec.link ? rec.link : {};
    return (
      <ThemedText
        key={node.key}
        style={[linkStyle, { color: primaryColor }]}
        onPress={() => handleLinkPress(url)}
      >
        @{displayName || handle}
      </ThemedText>
    );
  };
