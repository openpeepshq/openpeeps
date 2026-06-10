import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '~/components/ui/button';
import { CameraIcon, ImageIcon } from '~/components/icons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ThemedText } from '~/components/ui/themed-text';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { useOpenpeeps } from '@openpeeps/react';
import type { MediaAttachment, PostCreationData } from '@openpeeps/common';
import { uploadMedia, type UploadProgressMap } from '~/lib/uploadMedia';
import { MediaUploadProgress } from '~/components/custom/common';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { bottomSheetClose } from '~/lib/bottom-sheet-ref';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SendMediaSheetProps {
  onSelect: (images: MediaAttachment[]) => void;
}

// Media is selected via the system photo picker (launchImageLibrary), which
// needs no broad media permissions and keeps the app compliant with Google
// Play's photo & video permission policy.
export const SendMediaSheet = forwardRef<BottomSheetModal, SendMediaSheetProps>(
  (_, ref) => {
    const { openpeepsApi } = useOpenpeeps();
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const { data: server } = openpeepsApi.useServerInfo();
    const createAttachments =
      openpeepsApi.createMediaAttachmentWithProgressAction();
    const [uploadProgress, setUploadProgress] = useState<UploadProgressMap>({});
    const {
      conversationId,
      contnt,
      setContt,
      conversationAudience,
      setConversationAudience,
      setConversationId,
    } = useNewConversationStore();
    const sendMessage = openpeepsApi.createConversationPostAction({
      id: conversationId as string,
    });
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { t } = useTranslation();

    const addImages = (uris: string[]) =>
      setSelectedImages(prev => [
        ...prev,
        ...uris.filter(uri => !prev.includes(uri)),
      ]);

    const handleLibrary = async () => {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 0,
        quality: 1,
      });
      if (result.didCancel || !result.assets?.length) {
        return;
      }
      addImages(
        result.assets
          .map(asset => asset.uri)
          .filter((uri): uri is string => Boolean(uri)),
      );
    };

    const handleCameraPress = async () => {
      const result = await launchCamera({ mediaType: 'photo', quality: 1 });
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        addImages([uri]);
      }
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slideSize = event.nativeEvent.layoutMeasurement.width;
      const offset = event.nativeEvent.contentOffset.x;
      const currentIndex = Math.round(offset / slideSize);
      setCurrentImageIndex(currentIndex);
    };

    const renderSelectedImagesPreview = () => {
      if (selectedImages.length === 0) {
        return (
          <View className="w-full items-center justify-center py-12 px-4">
            <ImageIcon size={32} className="text-muted-foreground mb-2" />
            <Text className="text-muted-foreground text-center">
              {t('common.media.image.chooseFromLibrary')}
            </Text>
          </View>
        );
      }

      const IMAGE_WIDTH = SCREEN_WIDTH;

      return (
        <View className="w-full">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            className="w-full aspect-square"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={IMAGE_WIDTH}>
            {selectedImages.map(uri => (
              <View
                key={uri}
                style={{ width: Dimensions.get('window').width }}
                className="relative items-center justify-center">
                <Image
                  source={{ uri }}
                  style={{
                    width: Dimensions.get('window').width - 32,
                    height: Dimensions.get('window').width - 32,
                  }}
                  className="bg-muted rounded-lg"
                  resizeMode="cover"
                />
                {uploadProgress[uri] !== undefined && (
                  <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center px-6">
                    <MediaUploadProgress
                      uploadPercent={uploadProgress[uri].percent}
                      uploadEstimatedRemainingMs={
                        uploadProgress[uri].estimatedRemainingMs
                      }
                      isUploading
                      onFailed={reason =>
                        Toast.show({
                          type: 'error',
                          text1: t('form.upload.failed'),
                          text2: reason,
                        })
                      }
                    />
                  </View>
                )}
                <TouchableOpacity
                  onPress={() =>
                    setSelectedImages(prev => prev.filter(img => img !== uri))
                  }
                  className="absolute top-4 right-8 w-8 h-8 rounded-full bg-background/50 items-center justify-center">
                  <ThemedText className="text-lg">×</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {selectedImages.length > 1 && (
            <View className="flex-row justify-center mt-2 mb-2 gap-2">
              {selectedImages.map((_image, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                />
              ))}
            </View>
          )}
        </View>
      );
    };

    const handleSendMessage = async () => {
      try {
        setIsSending(true);
        const attachments = await Promise.all(
          selectedImages.map(imageUri =>
            uploadMedia({
              mediaUri: imageUri,
              createAttachments,
              type: 'image',
              usage: `${server?.communityConfig.content}:image`,
              alt: 'image',
              setUploadProgress,
            }),
          ),
        );

        const validAttachments = attachments.filter(
          (attachment): attachment is NonNullable<typeof attachment> =>
            attachment !== null,
        );

        await sendMessage({
          visibility: 'direct',
          type: 'note',
          audience: conversationAudience?.map(profile => ({
            ...profile,
            memberships: [],
            profileStats: {
              followersCount: 0,
              followingCount: 0,
            },
          })) as PostCreationData['audience'],
          data: {
            type: 'note',
            content: contnt,
            attachments: validAttachments,
          },
        });

        setContt('');
        setConversationAudience([]);
        setConversationId('');
        bottomSheetClose(ref);
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsSending(false);
      }
    };

    return (
      <BaseSheet ref={ref}>
        <View className="flex-1">
          <View className="flex-row justify-end items-center gap-4 px-4 py-3">
            <Button
              variant={'outline'}
              size={'icon'}
              className="rounded-full"
              onPress={handleLibrary}>
              <ImageIcon size={16} className="text-foreground" />
            </Button>
            <Button
              variant={'outline'}
              size={'icon'}
              className="rounded-full"
              onPress={handleCameraPress}>
              <CameraIcon size={16} className="text-foreground" />
            </Button>
          </View>

          <ScrollView className="flex-1">
            {renderSelectedImagesPreview()}
          </ScrollView>

          <SheetFooter
            onCancel={() => {
              setSelectedImages([]);
              bottomSheetClose(ref);
            }}
            onConfirm={handleSendMessage}
            disabled={selectedImages.length === 0 || isSending}
            confirmText={
              isSending ? t('common.media.sending') : t('common.media.send')
            }
          />
        </View>
      </BaseSheet>
    );
  },
);
