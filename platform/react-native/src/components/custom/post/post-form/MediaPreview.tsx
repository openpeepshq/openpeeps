import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {PlayIcon, VideoIcon, XIcon} from '~/components/icons';
import {ThemedText} from '~/components/ui/themed-text';
import {AltSheet} from '../../modals/media/alt-text-sheet';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {MediaAttachmentData} from '@openpeeps/common';
import {useOpenpeeps} from '@openpeeps/react';
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

const attachmentId = (att: MediaAttachmentData): string | undefined =>
  (att as MediaAttachmentData & {id?: string}).id;

interface MediaPreviewProps {
  attachments: MediaAttachmentData[];
  removeAttachment: (index: number) => void;
  updateAttachment: (index: number, attachment: MediaAttachmentData) => void;
  containerClassName?: string;
}

/**
 * Mounted only while an attachment is server-side processing. Subscribes to
 * `GET /media/:id/progress` (SSE) via `useMediaProgress` and merges attachment
 * state when the server reports `ready` / `failed`.
 */
interface ProcessingTrackerProps {
  attachmentId: string;
  attachment: MediaAttachmentData;
  onUpdate: (attachment: MediaAttachmentData) => void;
}

const ProcessingTracker: React.FC<ProcessingTrackerProps> = ({
  attachmentId: id,
  attachment,
  onUpdate,
}) => {
  const {openpeepsApi} = useOpenpeeps();
  const event = openpeepsApi.useMediaProgress(id);
  const reportedStatusRef = useRef<string | undefined>(attachment.status);

  useEffect(() => {
    const data = event?.mediaAttachment;
    if (!data) return;
    if (data.status === 'processing') return;
    if (data.status === reportedStatusRef.current) return;
    reportedStatusRef.current = data.status;
    if (__DEV__) {
      console.log('[ProcessingTracker] ready event', {
        id,
        previewUrl: data.previewUrl,
        url: data.url,
        type: data.type,
      });
    }
    // Replace with the server snapshot once processing finishes. Keep the
    // local `type` (the server occasionally normalizes it differently).
    onUpdate({...attachment, ...data, type: attachment.type});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.mediaAttachment?.status]);

  return null;
};

interface MediaPreviewItemProps {
  attachment: MediaAttachmentData;
  index: number;
  isActive: boolean;
  onRemove: () => void;
  onAltPress: () => void;
  onAttachmentUpdate: (attachment: MediaAttachmentData) => void;
}

const MediaPreviewItem: React.FC<MediaPreviewItemProps> = ({
  attachment,
  index,
  isActive,
  onRemove,
  onAltPress,
  onAttachmentUpdate,
}) => {
  const id = attachmentId(attachment);
  const isProcessing = attachment.status === 'processing' && !!id;

  const canShowAlt =
    attachment.type === 'image' ||
    (attachment.type === 'document' && attachmentHasRenderableImage(attachment));

  return (
    <View
      key={index}
      className="relative items-center justify-center w-screen md:size-96">
      {attachment.type === 'video' ? (
        <View className="overflow-hidden rounded-lg w-full aspect-square md:size-96 bg-muted">
          {attachment.previewUrl ? (
            <CachedImage
              url={attachment.previewUrl}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <VideoIcon size={48} className="text-muted-foreground" />
            </View>
          )}
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-black/60 items-center justify-center">
              <PlayIcon size={24} className="text-white" />
            </View>
          </View>
        </View>
      ) : attachment.type === 'audio' ? (
        <GalleryAudio attachment={attachment} isActive={isActive} />
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

      {isProcessing && id && (
        <>
          <ProcessingTracker
            attachmentId={id}
            attachment={attachment}
            onUpdate={onAttachmentUpdate}
          />
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center bg-black/40 rounded-lg">
            <ActivityIndicator size="large" color="#ffffff" />
            <ThemedText className="text-white text-xs mt-2">
              Processing…
            </ThemedText>
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={onRemove}
        className="absolute top-4 mt-3 right-8 w-8 h-8 rounded-full bg-background/50 items-center justify-center">
        <XIcon size={16} className="text-foreground" />
      </TouchableOpacity>
      {canShowAlt && (
        <TouchableOpacity
          onPress={onAltPress}
          className="absolute bottom-4 mt-3 right-8 w-16 h-10 rounded-full bg-background/50 items-center justify-center">
          <ThemedText>ALT</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

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
          <MediaPreviewItem
            key={attachmentId(attachment) ?? index}
            attachment={attachment}
            index={index}
            isActive={index === currentImageIndex}
            onRemove={() => removeAttachment(index)}
            onAltPress={handleAltModalPress}
            onAttachmentUpdate={updated => updateAttachment(index, updated)}
          />
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
