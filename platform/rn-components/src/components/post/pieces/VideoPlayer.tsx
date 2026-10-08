import React from 'react';
import { View } from 'react-native';
import type { MediaAttachmentData } from '@openpeepshq/common/types';
import { CachedVideoPlayer } from '~/components/custom/common/cached-video-player';
import { cn } from '~/lib/utils';

export interface VideoPlayerProps {
  attachment: MediaAttachmentData;
  title?: string;
  className?: string;
}

export const VideoPlayer = ({
  attachment,
  title,
  className,
}: VideoPlayerProps) => {
  if (!attachment.url) return null;
  return (
    <View className={cn('w-full', className)}>
      <CachedVideoPlayer url={attachment.url} title={title} />
    </View>
  );
};
