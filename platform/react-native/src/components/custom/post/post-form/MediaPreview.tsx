import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { XIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { AltSheet } from '../../modals/media/alt-text-sheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MediaAttachmentData } from '@openpeeps/common';
import { CachedVideoPlayer } from '../../common/cached-video-player';
import { CachedImage } from '../../common/cached-image';
interface MediaPreviewProps {
  attachments: MediaAttachmentData[];
  removeAttachment: (index: number) => void;
  updateAttachment: (index: number, attachment: MediaAttachmentData) => void;
  containerClassName?: string;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  attachments,
  removeAttachment,
  updateAttachment,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const altModalRef = useRef<BottomSheetModal>(null);

  const handleAltModalPress = useCallback(() => {
    altModalRef.current?.present();
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offset / slideSize);
    setCurrentImageIndex(currentIndex);
  };
  const handleAltUpdate = useCallback(
    (altText: string) => {
      attachments[currentImageIndex].description = altText;
      updateAttachment(currentImageIndex, attachments[currentImageIndex]);
      altModalRef.current?.dismiss();
    },
    [currentImageIndex, attachments, updateAttachment],
  );

  return (
    <View className="w-full flex justify-center items-center">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        className="w-full aspect-square md:size-96"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast">
        {attachments.map((attachment, index) => (
          <View
            key={index}
            className="relative items-center justify-center w-screen md:size-96">
            {attachment.type === 'video' ? (
              <View className="overflow-hidden rounded-lg">
                <CachedVideoPlayer
                  url={attachment.url}
                />
              </View>
            ) : (
              <CachedImage
                url={attachment.url}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}
            <TouchableOpacity
              onPress={() => removeAttachment(index)}
              className="absolute top-4 mt-3 right-8 w-8 h-8 rounded-full bg-background/50 items-center justify-center">
              <XIcon size={16} className="text-white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAltModalPress}
              className="absolute bottom-4 mt-3 right-8 w-16 h-10 rounded-full bg-background/50 items-center justify-center">
              <ThemedText>ALT</ThemedText>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {attachments && attachments.length > 1 && (
        <View className="flex-row justify-center mt-2 mb-2 gap-2">
          {attachments.map((_, index) => (
            <View
              key={index}
              className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-primary' : 'bg-muted'
                }`}
            />
          ))}
        </View>
      )}
      <AltSheet
        ref={altModalRef}
        onUpdate={handleAltUpdate}
        initialAltText={attachments[currentImageIndex]?.description || ''}
      />
    </View>
  );
};
