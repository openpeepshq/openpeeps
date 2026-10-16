import React from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import { isSvgUrl } from '@openpeepshq/react';
import { useCachedMediaUri } from '../../../hooks/use-cached-media-uri';
import { SvgImage } from '../../ui/svg-image';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  url: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({ url, ...props }) => {
  const svg = isSvgUrl(url);
  const imagePath = useCachedMediaUri(svg ? null : url);

  if (svg) {
    return (
      <SvgImage
        uri={url}
        className={props.className}
        resizeMode={props.resizeMode}
      />
    );
  }

  if (!imagePath) {
    return (
      <View style={props.style} className="items-center justify-center">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <Image {...props} source={{ uri: imagePath }} />;
};
