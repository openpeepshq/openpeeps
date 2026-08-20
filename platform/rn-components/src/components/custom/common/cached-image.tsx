import React from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import { useCachedMediaUri } from '~/hooks/use-cached-media-uri';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  url: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({ url, ...props }) => {
  const imagePath = useCachedMediaUri(url);

  if (!imagePath) {
    return (
      <View
        style={[
          props.style,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <Image {...props} source={{ uri: imagePath }} />;
};
