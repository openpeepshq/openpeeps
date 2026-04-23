import React from 'react';
import { MediaAttachmentData } from '@openpeeps/common';
import { View } from 'react-native';
import { AudioPlayer } from '../../../common/audio-player';

interface GalleryAudioProps {
    attachment: MediaAttachmentData;
    isActive: boolean;
}

export const GalleryAudio = ({ attachment, isActive }: GalleryAudioProps) =>
(
    <View
        className="size-full bg-muted rounded-none items-center justify-center">
        <AudioPlayer uri={attachment.url} isActive={isActive} />
    </View>
);
