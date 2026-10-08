import React from 'react';
import { View } from 'react-native';
import { extractUrlsFromText } from '@openpeepshq/react';
import { PreviewLink } from '../../preview-link/PreviewLink';

export interface ComposePreviewLinksProps {
  content?: string;
}

export const ComposePreviewLinks = ({ content }: ComposePreviewLinksProps) => {
  const urls = extractUrlsFromText(content);
  if (urls.length === 0) return null;

  return (
    <View className="my-2 gap-2">
      {urls.map((url) => (
        <PreviewLink key={url} url={url.replace(/[),.]+$/, '')} />
      ))}
    </View>
  );
};
