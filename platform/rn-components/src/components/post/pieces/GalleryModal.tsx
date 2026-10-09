import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MediaAttachmentData } from '@openpeepshq/common/types';
import { CachedImage } from '../../custom/common/cached-image';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '../../icons/index';
import { Button } from '../../ui/button';
import { ThemedText } from '../../ui/themed-text';
import { downloadDocument } from '../../../lib/downloadFile';
import { AudioAttachment, isAudioAttachment } from './AudioAttachment';
import { VideoPlayer } from './VideoPlayer';

export interface GalleryModalProps {
  attachments: MediaAttachmentData[];
  initialIndex?: number;
  onClose: () => void;
}

const isVideo = (att: MediaAttachmentData) =>
  att.type === 'video' || !!att.meta?.mimetype?.startsWith('video/');
const isImage = (att: MediaAttachmentData) =>
  att.type === 'image' || !!att.meta?.mimetype?.startsWith('image/');

export const GalleryModal = ({
  attachments,
  initialIndex = 0,
  onClose,
}: GalleryModalProps) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(initialIndex);
  const attachment = attachments[index];
  if (!attachment) return null;

  const prev = () =>
    setIndex((i) => (i === 0 ? attachments.length - 1 : i - 1));
  const next = () =>
    setIndex((i) => (i === attachments.length - 1 ? 0 : i + 1));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/80">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('posts.gallery.close')}
          className="absolute right-4 top-12 z-50 rounded-full bg-primary p-2"
          onPress={onClose}
        >
          <XIcon className="text-primary-foreground" size={20} />
        </Pressable>

        <View className="w-full max-h-[85%] items-center justify-center p-4">
          {isVideo(attachment) ? (
            <VideoPlayer key={attachment.url} attachment={attachment} />
          ) : isAudioAttachment(attachment) ? (
            <AudioAttachment
              key={attachment.url}
              src={attachment.url}
              label={attachment.filename ?? attachment.description}
              size={attachment.meta?.size}
            />
          ) : isImage(attachment) ? (
            <CachedImage
              url={attachment.url ?? attachment.previewUrl ?? ''}
              className="h-full w-full"
              resizeMode="contain"
            />
          ) : (
            <View className="items-center gap-3 rounded-md bg-muted p-6">
              <ThemedText className="font-medium">
                {attachment.filename ?? attachment.description ?? 'Document'}
              </ThemedText>
              {attachment.url ? (
                <Button
                  variant="link"
                  onPress={() => downloadDocument(attachment.url)}
                >
                  <ThemedText className="text-primary underline">
                    {t('posts.gallery.openDocument')}
                  </ThemedText>
                </Button>
              ) : null}
            </View>
          )}
        </View>

        {attachments.length > 1 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('posts.gallery.previous')}
              className="absolute left-2 top-1/2 z-50 -translate-y-1/2 rounded-full bg-white/15 p-3"
              onPress={prev}
            >
              <ChevronLeftIcon className="text-white" size={24} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('posts.gallery.next')}
              className="absolute right-2 top-1/2 z-50 -translate-y-1/2 rounded-full bg-white/15 p-3"
              onPress={next}
            >
              <ChevronRightIcon className="text-white" size={24} />
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
};
