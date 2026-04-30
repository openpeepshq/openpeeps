import React, {useEffect, useState} from 'react';
import {Image, ImageProps, ActivityIndicator, View} from 'react-native';
import {fetchCachedMedia} from '~/utils/media-cache';
import {toAbsoluteMediaUrl} from '~/lib/media-url';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  url: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({url, ...props}) => {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadImage = async () => {
      setLoading(true);
      try {
        const cachedPath = await fetchCachedMedia(url, 'image');
        const resolved =
          toAbsoluteMediaUrl(cachedPath ?? url) ?? cachedPath ?? url;
        setImagePath(resolved || url);
      } catch (err) {
        console.error('Error loading cached image:', err);
        setImagePath(toAbsoluteMediaUrl(url) ?? url);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      setImagePath(null);
      setLoading(true);
    };
  }, [url]);

  if (loading) {
    return (
      <View
        style={[props.style, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <Image {...props} source={{uri: imagePath!}} />;
};
