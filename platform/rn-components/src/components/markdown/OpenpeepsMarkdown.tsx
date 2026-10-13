import {
  preprocessMarkdownSource,
  type MarkdownRenderProps,
} from '@openpeepshq/common/lib';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { ReactNode, useMemo } from 'react';
import { Linking, View } from 'react-native';
import Markdown, {
  MarkdownIt,
  tokensToAST,
  stringToTokens,
} from 'react-native-markdown-display';
import { buildGoto } from '../navigation/helpers';
import { MainStackParamList } from '../navigation/types/index';
import { BASE_URL } from '../../lib/constants';
import { handleInternalURLNavigation } from '../../lib/utils';
import { hashtagPlugin, hashtagRenderer } from './extensions/hashtag';
import { mentionPlugin, mentionRenderer } from './extensions/mention';
import { codeBlockRenderer, fenceRenderer } from './extensions/codeBlock';
import { codeInlineRenderer } from './extensions/codeInline';
import { htmlBlockRenderer, htmlInlineRenderer } from './extensions/html';
import { markdownTheme } from './theme';
import { extractLinks, isEmail, isInternalLink, toGotoUrl } from './utils';
import { PreviewLink } from '../preview-link';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import { recordOutboundClick } from '@openpeepshq/react';

export interface OpenpeepsMarkdownProps extends MarkdownRenderProps {}

export const OpenpeepsMarkdown = ({
  source,
  mentions = [],
  linkPreviewMode = 'none',
  newTab = false,
}: OpenpeepsMarkdownProps) => {
  const { colors } = useOpenPeepsTheme();
  const styles = useMemo(() => markdownTheme(colors), [colors]);

  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const markdownit = useMemo(() => {
    // html: true so inline HTML (iframes, etc.) is tokenized and passed
    // to custom renderers that apply the same allowlist as the web side.
    const md = MarkdownIt({ linkify: true, typographer: true, html: true });
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

  const handleIframePress = (url: string) => {
    const origin = BASE_URL as string;
    recordOutboundClick(url, origin);
    Linking.openURL(url);
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
    () =>
      stringToTokens(
        preprocessMarkdownSource(source ?? '', mentions),
        markdownit
      ),
    [source, mentions, markdownit]
  );
  const links = useMemo(
    () => tokens.flatMap(extractLinks).filter((link) => !isEmail(link)),
    [tokens]
  );
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
        onLinkPress={(url) => {
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
          html_block: htmlBlockRenderer(handleIframePress),
          html_inline: htmlInlineRenderer(handleIframePress),
        }}
      >
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
