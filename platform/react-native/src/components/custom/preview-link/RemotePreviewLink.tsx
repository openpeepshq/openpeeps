import React from 'react';
import { View, Image, TouchableOpacity, Linking } from 'react-native';
import { ThemedText as Text } from '~/components/ui/themed-text';
import { useOpenpeeps } from '@openpeepshq/react';
import { ActivityIndicator } from 'react-native';

interface RemotePreviewLinkProps {
  url: string;
}

export const RemotePreviewLink = ({ url }: RemotePreviewLinkProps) => {
  const { openpeepsApi } = useOpenpeeps();

  const { data: linkPreview, isLoading, isError } = openpeepsApi.usePreviewLink(url);

  const handlePress = () => {
    Linking.openURL(url);
  };

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
        {url && linkPreview.data && (
          <View className="flex w-full flex-row items-center gap-4 p-2">
            {image && (
              <View className="flex h-32 w-32 flex-shrink-0 items-center justify-center">
                <Image
                  source={{ uri: image }}
                  className="h-full w-full rounded-md object-cover object-center"
                  resizeMode="cover"
                />
              </View>
            )}
            <View
              className={`flex ${image ? 'w-32 flex-1' : 'w-full'
                } flex-col items-start justify-start gap-y-3`}>
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
        )}
      </View>
    </TouchableOpacity>
  );
};

