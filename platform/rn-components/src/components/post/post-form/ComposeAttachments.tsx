import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { XIcon } from '../../icons/index';
import { ThemedText } from '../../ui/themed-text';
import { AltSheet } from '../../custom/modals/media/alt-text-sheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { MediaAttachmentData } from '@openpeepshq/common';
import { isImageAttachment } from '../../../lib/attachmentHelpers';
import { AttachmentCard, attachmentId } from './AttachmentCard';

interface MediaPreviewProps {
  attachments: MediaAttachmentData[];
  removeAttachment: (index: number) => void;
  updateAttachment: (index: number, attachment: MediaAttachmentData) => void;
  containerClassName?: string;
}

export const ComposeAttachments: React.FC<MediaPreviewProps> = ({
  attachments,
  removeAttachment,
  updateAttachment,
}) => {
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const altModalRef = useRef<BottomSheetModal>(null);

  const currentAttachment = attachments[currentImageIndex];
  const canShowAlt = currentAttachment
    ? isImageAttachment(currentAttachment)
    : false;

  useEffect(() => {
    if (attachments.length > 0 && currentImageIndex >= attachments.length) {
      setCurrentImageIndex(attachments.length - 1);
    }
  }, [attachments.length, currentImageIndex]);

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
    [currentImageIndex, attachments, updateAttachment]
  );

  return (
    <View className="relative w-full flex justify-center items-center">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        className="w-full aspect-square md:size-96"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {attachments.map((attachment, index) => (
          <AttachmentCard
            key={attachmentId(attachment) ?? index}
            attachment={attachment}
            isActive={index === currentImageIndex}
            onUpdate={(updated) => updateAttachment(index, updated)}
          />
        ))}
      </ScrollView>

      <View
        pointerEvents="box-none"
        className="absolute top-3 right-3 z-50 flex-row gap-2"
      >
        {canShowAlt && (
          <TouchableOpacity
            onPress={handleAltModalPress}
            accessibilityRole="button"
            accessibilityLabel={t('form.imageEditModal.altText', {
              defaultValue: 'Alt text',
            })}
            className="min-h-10 px-3 rounded-full bg-background/90 border border-border items-center justify-center"
          >
            <ThemedText className="text-xs font-semibold">ALT</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => removeAttachment(currentImageIndex)}
          accessibilityRole="button"
          accessibilityLabel={t('posts.attachments.deleteTitle', {
            defaultValue: 'Delete attachment',
          })}
          className="w-10 h-10 rounded-full bg-background/90 border border-border items-center justify-center"
        >
          <XIcon size={18} className="text-foreground" />
        </TouchableOpacity>
      </View>
      {attachments && attachments.length > 1 && (
        <View className="flex-row justify-center mt-2 mb-2 gap-2">
          {attachments.map((_, index) => (
            <View
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentImageIndex ? 'bg-primary' : 'bg-surface'
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
