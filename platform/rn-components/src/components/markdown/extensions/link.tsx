import React from 'react';
import { type RenderFunction } from 'react-native-markdown-display';
import { isExternalLink } from '@openpeepshq/common/lib';
import { ThemedText } from '../../ui/themed-text';
import { BASE_URL } from '../../../lib/constants';

/**
 * Custom link renderer that appends a Unicode external-link indicator
 * (↗) after links pointing outside the instance.
 */
export const linkRenderer =
  (handleLinkPress: (url: string) => void): RenderFunction =>
  (node, children, _parentNodes, styles) => {
    const href = node.attributes.href || '';
    const origin = BASE_URL as string;
    const isExternal = isExternalLink(href, origin);

    const rec =
      styles && typeof styles === 'object'
        ? (styles as Record<string, object>)
        : {};
    const linkStyle: object = 'link' in rec && rec.link ? rec.link : {};

    return (
      <ThemedText
        key={node.key}
        style={[linkStyle, styles?.text]}
        onPress={() => handleLinkPress(href)}
      >
        {children}
        {isExternal ? ' ↗' : null}
      </ThemedText>
    );
  };
