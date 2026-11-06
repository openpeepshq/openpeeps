import React, { useState } from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText as Text } from '../ui/themed-text';
import { useOpenpeeps, recordOutboundClick } from '@openpeepshq/react';
import { isExternalLink, videoEmbedForUrl } from '@openpeepshq/common/lib';
import { ActivityIndicator } from 'react-native';
import { CachedImage } from '../custom/common/index';
import { VideoPlayOverlay } from '../post/VideoPlayOverlay';

interface RemotePreviewLinkProps {
  url: string;
}

export const RemotePreviewLink = ({ url }: RemotePreviewLinkProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const embed = videoEmbedForUrl(url);
  // Click-to-load: the server-fetched card (no third-party request) is the
  // default view; the WebView mounts only after an explicit tap.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const {
    data: linkPreview,
    isLoading,
    isError,
  } = openpeepsApi.usePreviewLink(url);

  const handlePress = () => {
    if (embed) {
      setLoadedUrl(url);
      return;
    }
    recordOutboundClick(url);
    Linking.openURL(url);
  };

  if (embed && loadedUrl === url) {
    // Same pattern as the markdown iframe renderer: allow same-origin
    // navigations (e.g. YouTube play state), open cross-origin in browser.
    return (
      <View className="my-2 w-full">
        <WebView
          source={{ uri: embed.embedUrl }}
          style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 8 }}
          scrollEnabled={false}
          onShouldStartLoadWithRequest={(nav) => {
            // Sub-frames (players spawn cross-origin child frames on iOS)
            // must not be hijacked into the browser.
            if (!nav.isTopFrame || nav.navigationType !== 'click') {
              return true;
            }
            if (isExternalLink(nav.url, embed.origin)) {
              Linking.openURL(nav.url);
              return false;
            }
            return true;
          }}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="w-full">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !linkPreview?.data) {
    return null;
  }

  const { image, title, description } = linkPreview.data;

  return (
    <TouchableOpacity onPress={handlePress} className="w-full no-underline">
      <View className="card w-full">
        <View className="flex w-full flex-row items-center gap-4 p-2">
          {(image || embed) && (
            <View className="relative flex h-32 w-32 flex-shrink-0 items-center justify-center">
              {image && (
                <CachedImage
                  url={image}
                  className="h-full w-full rounded-md object-cover object-center"
                  resizeMode="cover"
                />
              )}
              <VideoPlayOverlay video={Boolean(embed)} />
            </View>
          )}
          <View
            className={`flex ${
              image || embed ? 'w-32 flex-1' : 'w-full'
            } flex-col items-start justify-start gap-y-3`}
          >
            <View className="w-fit">
              <Text className="text-foreground text-sm font-thin sm:text-xs">
                {new URL(url).hostname}
              </Text>
            </View>
            <View className="w-fit font-bold">
              <Text className="font-bold">{title ?? ''}</Text>
            </View>
            <View className="text-foreground w-full truncate text-sm font-thin">
              <Text>{description ?? ''}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
