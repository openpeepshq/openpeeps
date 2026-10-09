import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MediaAttachmentData } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { VideoIcon } from '../../icons/index';
import { ThemedText } from '../../ui/themed-text';
import { isImageAttachment } from '../../../lib/attachmentHelpers';
import { CachedImage } from '../../custom/common/cached-image';
import { DocumentAttachment } from '../pieces/DocumentAttachment';
import { GalleryAudio } from '../pieces/gallery/GalleryAudio';
import { VideoPlayOverlay } from '../VideoPlayOverlay';

export const attachmentId = (att: MediaAttachmentData): string | undefined =>
  (att as MediaAttachmentData & { id?: string }).id;

interface ProcessingTrackerProps {
  attachmentId: string;
  attachment: MediaAttachmentData;
  onUpdate: (attachment: MediaAttachmentData) => void;
}

/**
 * Mounted only while an attachment is server-side processing. Subscribes to
 * `GET /media/:id/progress` (SSE) and merges attachment state when the server
 * reports `ready` / `failed`.
 */
const ProcessingTracker = ({
  attachmentId: id,
  attachment,
  onUpdate,
}: ProcessingTrackerProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const event = openpeepsApi.useMediaProgress(id);
  const reportedStatusRef = useRef<string | undefined>(attachment.status);

  useEffect(() => {
    const data = event?.mediaAttachment;
    if (!data) return;
    if (data.status === 'processing') return;
    if (data.status === reportedStatusRef.current) return;
    reportedStatusRef.current = data.status;
    onUpdate({ ...attachment, ...data });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.mediaAttachment?.status]);

  return null;
};

export interface AttachmentCardProps {
  attachment: MediaAttachmentData;
  /** Only the visible carousel item keeps its audio player active. */
  isActive: boolean;
  onUpdate: (attachment: MediaAttachmentData) => void;
}

export const AttachmentCard = ({
  attachment,
  isActive,
  onUpdate,
}: AttachmentCardProps) => {
  const { t } = useTranslation();
  const id = attachmentId(attachment);
  const isProcessing = attachment.status === 'processing' && !!id;

  return (
    <View className="relative w-screen items-center justify-center md:size-96">
      {attachment.type === 'video' ? (
        <View className="aspect-square w-full overflow-hidden rounded-lg bg-muted md:size-96">
          {attachment.previewUrl ? (
            <CachedImage
              url={attachment.previewUrl}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <VideoIcon size={48} className="text-muted-foreground" />
            </View>
          )}
          <VideoPlayOverlay video />
        </View>
      ) : attachment.type === 'audio' ? (
        <GalleryAudio attachment={attachment} isActive={isActive} />
      ) : isImageAttachment(attachment) ? (
        <View className="aspect-square w-full overflow-hidden rounded-lg md:size-96">
          <CachedImage
            url={attachment.previewUrl || attachment.url}
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
      ) : attachment.type === 'document' ? (
        <View>
          <DocumentAttachment attachment={attachment} />
        </View>
      ) : null}

      {isProcessing && id ? (
        <>
          <ProcessingTracker
            attachmentId={id}
            attachment={attachment}
            onUpdate={onUpdate}
          />
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center rounded-lg bg-black/40"
          >
            <ActivityIndicator size="large" color="#ffffff" />
            <ThemedText className="mt-2 text-xs text-white">
              {t('form.upload.processing')}
            </ThemedText>
          </View>
        </>
      ) : null}
    </View>
  );
};
