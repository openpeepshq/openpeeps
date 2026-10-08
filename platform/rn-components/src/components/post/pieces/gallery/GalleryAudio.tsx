import React from 'react';
import { MediaAttachmentData } from '@openpeepshq/common';
import { View } from 'react-native';
import { AudioAttachment } from '../AudioAttachment';

interface GalleryAudioProps {
  attachment: MediaAttachmentData;
  isActive: boolean;
}

export const GalleryAudio = ({ attachment, isActive }: GalleryAudioProps) => (
  <View className="size-full items-center justify-center rounded-none bg-muted p-4">
    <AudioAttachment
      src={attachment.url}
      label={attachment.filename ?? attachment.description}
      size={attachment.meta?.size}
      isActive={isActive}
    />
  </View>
);
