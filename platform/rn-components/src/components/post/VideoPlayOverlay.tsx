import React from 'react';
import { View } from 'react-native';
import { PlayIcon } from '~/components/icons';

export interface VideoPlayOverlayProps {
  video: boolean;
}

/** Play affordance on video thumbnails; the parent handles the press. */
export const VideoPlayOverlay = ({ video }: VideoPlayOverlayProps) => {
  if (!video) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 items-center justify-center"
    >
      <View className="size-12 items-center justify-center rounded-full bg-black/60">
        <PlayIcon size={32} className="text-white" />
      </View>
    </View>
  );
};
