import {
  linkProfileMentions,
  type MentionProfileRef,
} from '@openpeepshq/common/lib';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { ReactNode, useMemo } from 'react';
import { Linking, View } from 'react-native';
import Markdown, { MarkdownIt, tokensToAST, stringToTokens } from 'react-native-markdown-display';
import { buildGoto } from '~/components/navigation/helpers';
import { MainStackParamList } from '~/components/navigation/types';
import { BASE_URL } from '~/lib/constants';
import { handleInternalURLNavigation } from '~/lib/utils';
import { hashtagPlugin, hashtagRenderer } from './extensions/hashtag';
import { mentionPlugin, mentionRenderer } from './extensions/mention';
import { codeBlockRenderer, fenceRenderer } from './extensions/codeBlock';
import { codeInlineRenderer } from './extensions/codeInline';
import { markdownTheme } from './theme';
import { extractLinks, isEmail, isInternalLink, toGotoUrl } from './utils';
import { PreviewLink } from '../preview-link';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';
import { recordOutboundClick } from '@openpeepshq/react';

interface OpenPeepsMarkdownProps {
  source: string;
  mentions?: MentionProfileRef[];
  linkPreviewMode?: 'prepend' | 'append' | 'inline' | 'none';
  /** When true, same-origin links open in the system browser instead of in-app navigation. */
  newTab?: boolean | ((link: string) => boolean);
}

export const OpenPeepsMarkdown = ({
  source,
  mentions = [],
  linkPreviewMode = 'none',
  newTab = false,
}: OpenPeepsMarkdownProps) => {
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

  const shouldOpenExternally = (url: string) => {
    const origin = BASE_URL as string;
    if (!isInternalLink(url, origin)) {
      return true;
    }
    return typeof newTab === 'function' ? newTab(url) : newTab;
  };

  const handleLinkPress = (url: string) => {
    const origin = BASE_URL as string;
    if (shouldOpenExternally(url)) {
      recordOutboundClick(url, origin);
      Linking.openURL(url);
      return;
    }
    handleInternalURLNavigation(toGotoUrl(url, origin), goto);
  };

  const tokens = useMemo(
    () => stringToTokens(linkProfileMentions(source, mentions), markdownit),
    [source, mentions, markdownit],
  );
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
