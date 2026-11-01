import React from 'react';
import { Image, View } from 'react-native';
import type { MediaAttachmentData } from '@openpeepshq/common/types';
import { AudioPlayer } from '../../custom/common/audio-player';
import { ThemedText } from '../../ui/themed-text';
import { cn } from '../../../lib/utils';

export const isAudioAttachment = (
  att: Pick<MediaAttachmentData, 'type' | 'meta'>
): boolean =>
  att.type === 'audio' || !!att.meta?.mimetype?.startsWith('audio/');

export interface AudioAttachmentProps {
  src?: string;
  /** Waveform/thumbnail image rendered above the player when available. */
  previewUrl?: string;
  label?: string;
  size?: number;
  /** Only the visible carousel item keeps its player active. */
  isActive?: boolean;
  className?: string;
}

const formatBytes = (bytes?: number): string | undefined => {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
};

export const AudioAttachment = ({
  src,
  previewUrl,
  label,
  size,
  isActive = true,
  className,
}: AudioAttachmentProps) => {
  if (!src) return null;
  const sizeLabel = formatBytes(size);
  return (
    <View className={cn('w-full gap-1 rounded-md bg-muted p-3', className)}>
      {previewUrl ? (
        <Image
          source={{ uri: previewUrl }}
          resizeMode="cover"
          className="mb-1 h-40 w-full rounded-md"
        />
      ) : null}
      {label ? (
        <View className="flex-row items-center gap-2">
          <ThemedText className="flex-1 text-sm font-medium" numberOfLines={1}>
            {label}
          </ThemedText>
          {sizeLabel ? (
            <ThemedText className="text-xs text-muted-foreground">
              {sizeLabel}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      <AudioPlayer uri={src} isActive={isActive} />
    </View>
  );
};
