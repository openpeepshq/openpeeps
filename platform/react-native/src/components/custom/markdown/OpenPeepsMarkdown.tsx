import {
  MentionWithProfile,
} from '@openpeeps/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { ReactNode, useMemo } from 'react';
import { Linking, View } from 'react-native';
import Markdown, { MarkdownIt, tokensToAST, stringToTokens } from 'react-native-markdown-display';
import { buildGoto } from '~/components/navigation/helpers';
import { MainStackParamList } from '~/components/navigation/types';
import { BASE_URL } from '~/lib/constants';
import { handleInternalURLNavigation, isLocalLink } from '~/lib/utils';
import { hashtagPlugin, hashtagRenderer } from './extensions/hashtag';
import { mentionPlugin, mentionRenderer } from './extensions/mention';
import { codeBlockRenderer, fenceRenderer } from './extensions/codeBlock';
import { codeInlineRenderer } from './extensions/codeInline';
import { markdownTheme } from './theme';
import { extractLinks, isEmail } from './utils';
import { PreviewLink } from '../preview-link';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';

interface OpenPeepsMarkdownProps {
  source: string;
  mentions?: MentionWithProfile[];
  linkPreviewMode?: 'prepend' | 'append' | 'inline' | 'none';
}

export const OpenPeepsMarkdown = ({ source, mentions = [], linkPreviewMode = 'none' }: OpenPeepsMarkdownProps) => {
  const { colors } = useOpenPeepsTheme();
  const styles = useMemo(() => markdownTheme(colors), [colors]);

  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const markdownit = useMemo(() => {
    const md = MarkdownIt({ linkify: true, typographer: true });
    md.use(hashtagPlugin);
    md.use(mentionPlugin(mentions));
    return md;
  }, [mentions]);

  const goto = buildGoto(navigation);

  const handleLinkPress = (url: string) => {
    const isLocal = isLocalLink(url, BASE_URL as string);
    if (url.includes('goto:/') || isLocal) {
      handleInternalURLNavigation(url, goto);
    } else {
      Linking.openURL(url);
    }
  };

  const tokens = useMemo(() => stringToTokens(source, markdownit), [source, markdownit]);
  const links = useMemo(() => tokens.flatMap(extractLinks).filter((link) => !isEmail(link)), [tokens]);
  const ast = useMemo(() => tokensToAST(tokens), [tokens]);

  return (
    <View>
      {linkPreviewMode === 'prepend' && links.length > 0 && (
        <View className="mb-4">
          {links.map((link) => (
            <PreviewLink key={link} url={link} />
          ))}
        </View>
      )}
      <Markdown
        style={styles}
        onLinkPress={url => {
          handleLinkPress(url);
          return false;
        }}
        markdownit={markdownit}
        rules={{
          hashtag: hashtagRenderer(handleLinkPress, colors.primary),
          mention: mentionRenderer(handleLinkPress, colors.primary, mentions),
          code_block: codeBlockRenderer(colors),
          fence: fenceRenderer(colors),
          code_inline: codeInlineRenderer(colors),
        }}>
        {ast as unknown as ReactNode[]}
      </Markdown>
      {linkPreviewMode === 'append' && links.length > 0 && (
        <View className="mt-4">
          {links.map((link) => (
            <PreviewLink key={link} url={link} />
          ))}
        </View>
      )}
    </View>
  );
};
