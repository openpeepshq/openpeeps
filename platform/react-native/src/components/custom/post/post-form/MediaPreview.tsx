import React, {useCallback, useRef, useState} from 'react';
import {View, ScrollView, TouchableOpacity} from 'react-native';
import {XIcon} from '~/components/icons';
import {ThemedText} from '~/components/ui/themed-text';
import {AltSheet} from '../../modals/media/alt-text-sheet';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {MediaAttachmentData} from '@openpeeps/common';
import {CachedVideoPlayer} from '../../common/cached-video-player';
import {CachedImage} from '../../common/cached-image';
import {DocumentAttachment} from '../pieces/DocumentAttachment';
import {GalleryAudio} from '../pieces/gallery/GalleryAudio';

function attachmentHasRenderableImage(att: MediaAttachmentData): boolean {
  const mime = att.meta?.mimetype?.toLowerCase?.() ?? '';
  if (mime.startsWith('image/')) return true;
  if (att.previewUrl && att.type === 'document') return true;
  const fname = att.filename ?? '';
  if (
    att.type === 'document' &&
    /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(fname)
  ) {
    return true;
  }
  return false;
}
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

  const handleScroll = (event: any) => {
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
                <CachedVideoPlayer url={attachment.url} />
              </View>
            ) : attachment.type === 'audio' ? (
              <GalleryAudio
                attachment={attachment}
                isActive={index === currentImageIndex}
              />
            ) : attachment.type === 'image' ||
              (attachment.type === 'document' &&
                attachmentHasRenderableImage(attachment)) ? (
              <View className="overflow-hidden rounded-lg w-full aspect-square md:size-96">
                <CachedImage
                  url={attachment.previewUrl || attachment.url}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ) : attachment.type === 'document' ? (
              <View>
                <DocumentAttachment attachment={attachment} />
              </View>
            ) : null}
            <TouchableOpacity
              onPress={() => removeAttachment(index)}
              className="absolute top-4 mt-3 right-8 w-8 h-8 rounded-full bg-background/50 items-center justify-center">
              <XIcon size={16} className="text-foreground" />
            </TouchableOpacity>
            {(attachment.type === 'image' ||
              (attachment.type === 'document' &&
                attachmentHasRenderableImage(attachment))) && (
              <TouchableOpacity
                onPress={handleAltModalPress}
                className="absolute bottom-4 mt-3 right-8 w-16 h-10 rounded-full bg-background/50 items-center justify-center">
                <ThemedText>ALT</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
      {attachments && attachments.length > 1 && (
        <View className="flex-row justify-center mt-2 mb-2 gap-2">
          {attachments.map((_, index) => (
            <View
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentImageIndex ? 'bg-primary' : 'bg-muted'
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
