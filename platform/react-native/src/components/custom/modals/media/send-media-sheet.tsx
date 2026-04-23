import React, { forwardRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { Album, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '~/components/ui/button';
import { CameraIcon, ChevronDownIcon, CheckIcon } from '~/components/icons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { launchCamera } from 'react-native-image-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ThemedText } from '~/components/ui/themed-text';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { useOpenpeeps } from '@openpeeps/react';
import type { MediaAttachment } from '@openpeeps/common';
import { uploadMedia } from '~/lib/uploadMedia';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SendMediaSheetProps {
  onSelect: (images: MediaAttachment[]) => void;
}

export const SendMediaSheet = forwardRef<BottomSheetModal, SendMediaSheetProps>(
  (_, ref) => {
    const [images, setImages] = useState<PhotoIdentifier[]>([]);
    const { openpeepsApi } = useOpenpeeps();
    const [albums, setAlbums] = useState<Album[]>([]);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const { data: server } = openpeepsApi.useServerInfo();
    const createAttachments = openpeepsApi.createMediaAttachmentAction();
    const [isMultipleSelect, setIsMultipleSelect] = useState(false);
    const [uploadingImages, setUploadingImages] = useState<{
      [key: string]: boolean;
    }>({});
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

    useEffect(() => {
      loadImages();
    }, []);

    const loadImages = async () => {
      try {
        const photos = await CameraRoll.getPhotos({
          first: 20,
          assetType: 'Photos',
        });
        setImages(photos.edges);
        setAlbums(await CameraRoll.getAlbums());
      } catch (error) {
        console.error('Load images error:', error);
      }
    };

    const loadImagesFromAlbum = async (albumName: string) => {
      try {
        const photos = await CameraRoll.getPhotos({
          first: 20,
          assetType: 'Photos',
          groupName: albumName,
        });
        setImages(photos.edges);
      } catch (error) {
        console.error('Load album images error:', error);
      }
    };

    const toggleImageSelection = (uri: string) => {
      if (!isMultipleSelect) {
        setSelectedImages([uri]);
        return;
      }

      setSelectedImages(prev =>
        prev.includes(uri)
          ? prev.filter(imageId => imageId !== uri)
          : [...prev, uri],
      );
    };

    const handleCameraPress = async () => {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 1,
      });

      if (result.assets && result.assets[0]?.uri) {
        toggleImageSelection(result.assets[0].uri);
      }
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slideSize = event.nativeEvent.layoutMeasurement.width;
      const offset = event.nativeEvent.contentOffset.x;
      const currentIndex = Math.round(offset / slideSize);
      setCurrentImageIndex(currentIndex);
    };

    const renderSelectedImagesPreview = () => {
      if (selectedImages.length === 0) { return null; }

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
                {uploadingImages[uri] && (
                  <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center">
                    <ActivityIndicator size="large" color="white" />
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
              setUploadingMedia: setUploadingImages,
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
            profileStats: {
              followersCount: 0,
              followingCount: 0,
            },
          })),
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
          {renderSelectedImagesPreview()}

          <View className="flex-row justify-between items-center px-4 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex-row items-center">
                  <Text className="text-foreground text-base font-semibold mr-1">
                    {t('common.media.image.recents')}
                  </Text>
                  <ChevronDownIcon size={20} className="text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-1">
                <DropdownMenuGroup>
                  {albums.map(album => (
                    <DropdownMenuItem
                      key={album.title}
                      onPress={() => loadImagesFromAlbum(album.title)}>
                      <Text className="text-base">{album.title}</Text>
                      <Text className="text-sm text-muted-foreground ml-2">
                        {album.count}
                      </Text>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <View className="flex-row items-center gap-4">
              <Button
                variant={isMultipleSelect ? 'secondary' : 'ghost'}
                size={'sm'}
                onPress={() => setIsMultipleSelect(!isMultipleSelect)}>
                <Text className="text-foreground text-base font-medium">
                  {t('common.form.selectMultiple')}
                </Text>
              </Button>
              <Button
                variant={'outline'}
                size={'icon'}
                className="rounded-full"
                onPress={handleCameraPress}>
                <CameraIcon size={16} className="text-foreground" />
              </Button>
            </View>
          </View>

          <ScrollView className="flex-1">
            <View className="flex-row flex-wrap">
              {images.map(({ node: image }) => (
                <TouchableOpacity
                  key={image.image.uri}
                  className="w-1/3 aspect-square p-0.5"
                  onPress={() => toggleImageSelection(image.image.uri)}>
                  <View className="relative w-full h-full">
                    <Image
                      source={{ uri: image.image.uri }}
                      className="w-full h-full"
                    />
                    {selectedImages.includes(image.image.uri) && (
                      <View className="absolute inset-0">
                        <View className="absolute inset-0 bg-primary/20" />
                        {isMultipleSelect && (
                          <View className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-white items-center justify-center">
                            <CheckIcon className="text-black" size={18} />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
