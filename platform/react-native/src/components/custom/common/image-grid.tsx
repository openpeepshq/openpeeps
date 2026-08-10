import React, {useState} from 'react';

import {Dimensions, Image, TouchableOpacity, View} from 'react-native';
import {ThemedText} from '../../ui/themed-text';
import ImageView from 'react-native-image-viewing';
import {type MediaAttachmentData} from '@openpeepshq/common';

export const ImageGrid = ({images}: {images: MediaAttachmentData[]}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const screenWidth = Dimensions.get('window').width;
  const containerWidth = screenWidth - 32;
  const gap = 0;

  const getImageDimensions = (index: number, total: number) => {
    switch (true) {
      case total === 1:
        return {
          width: containerWidth,
          height: 200,
        };
      case total === 2:
        return {
          width: (containerWidth - gap) / 2,
          height: 200,
        };
      case total === 3:
        if (index === 0) {
          return {
            width: containerWidth,
            height: 200,
          };
        }
        return {
          width: (containerWidth - gap) / 2,
          height: 100,
        };
      case total >= 4:
        return {
          width: (containerWidth - gap) / 2,
          height: 100,
        };
      default:
        return {
          width: containerWidth,
          height: 200,
        };
    }
  };

  return (
    <View className="mt-3">
      <View className="flex-row flex-wrap gap-1">
        {images.slice(0, 4).map((image, index) => {
          const dimensions = getImageDimensions(index, images.length);
          return (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setImageIndex(index);
                setIsVisible(true);
              }}>
              <Image
                source={{uri: image.url}}
                className="rounded"
                style={{
                  width: dimensions.width,
                  height: dimensions.height,
                }}
              />
              {index === 3 && images.length > 4 && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center rounded">
                  <ThemedText className="text-white text-lg font-medium">
                    +{images.length - 4}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <ImageView
        images={images.map(img => ({uri: img.url}))}
        imageIndex={imageIndex}
        visible={isVisible}
        onRequestClose={() => setIsVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
    </View>
  );
};
