import React, { forwardRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { Album, PhotoIdentifier } from '@react-native-camera-roll/camera-roll';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '../../../ui/button';
import { CameraIcon, ChevronDownIcon, CheckIcon } from '../../../icons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import ImagePicker from 'react-native-image-crop-picker';
import { launchCamera } from 'react-native-image-picker';
import { Platform } from 'react-native';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import { MediaAttachment } from '@openpeeps/common';
import { uploadMedia } from '../../../../lib/uploadMedia';
import { useOpenpeeps } from '@openpeeps/react';
import Toast from 'react-native-toast-message';
import { useOpenPeepsTheme } from '../../../../theme/OpenPeepsThemeProvider';
import { bottomSheetClose } from '../../../../lib/bottom-sheet-ref';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImagePickerSheetProps {
  onSelect: (images: MediaAttachment[]) => void;
}

export const ImagePickerSheet = forwardRef<
  BottomSheetModal,
  ImagePickerSheetProps
>(({ onSelect }, ref) => {
  const [images, setImages] = useState<PhotoIdentifier[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isMultipleSelect, setIsMultipleSelect] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();
  const { colors, isDark } = useOpenPeepsTheme();

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const photos = await CameraRoll.getPhotos({
        first: 100,
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
        first: 100,
        assetType: 'Photos',
        groupName: albumName,
      });
      setImages(photos.edges);
    } catch (error) {
      console.error('Load album images error:', error);
    }
  };

  const handleImageSelection = async (uri: string) => {
    try {
      setIsLoading(true);
      if (Platform.OS === 'ios') {
        setTimeout(() => StatusBar.setHidden(true, 'slide'), 20);
      }

      if (Platform.OS === 'android') {
        await ImagePicker.openCropper({
          path: uri,
          width: 1000,
          height: 1000,
          mediaType: 'photo',
        });
      } else {
        await ImagePicker.openCropper({
          path: uri,
          width: 1000,
          height: 1000,
          cropperToolbarTitle: t('form.imageEditModal.title'),
          cropperToolbarColor: colors.background,
          mediaType: 'photo',
          cropperStatusBarLight: !isDark,
          cropperToolbarWidgetColor: colors.foreground,
        });
      }

      if (!isMultipleSelect) {
        setSelectedImages([uri]);
        return;
      }

      setSelectedImages(prev =>
        prev.includes(uri)
          ? prev.filter(imageId => imageId !== uri)
          : [...prev, uri],
      );
    } catch (error) {
      console.log('User cancelled cropping');
    } finally {
      setIsLoading(false);
      if (Platform.OS === 'ios') {
        StatusBar.setHidden(false, 'fade');
      }
    }
  };

  const handleCameraPress = async () => {
    try {
      setIsLoading(true);
      if (Platform.OS === 'android') {
        const result = await ImagePicker.openCamera({
          width: 1000,
          height: 1000,
          cropping: true,
          mediaType: 'photo',
        });
        setSelectedImages([result.path]);
      } else {
        const result = await launchCamera({
          mediaType: 'photo',
          quality: 1,
        });

        if (result.errorCode) {
          Toast.show({
            type: 'error',
            text1: t('form.imageInput.camera.error'),
          });
          return;
        }

        if (result.assets && result.assets[0]?.uri) {
          const croppedImage = await ImagePicker.openCropper({
            path: result.assets[0].uri,
            width: 1000,
            height: 1000,
            cropperToolbarTitle: t('form.imageEditModal.title'),
            cropperToolbarColor: colors.background,
            mediaType: 'photo',
            cropperStatusBarLight: !isDark,
            cropperToolbarWidgetColor: colors.foreground,
          });

          setSelectedImages([croppedImage.path]);
        }
      }
    } catch (error) {
      console.log('User cancelled camera or cropping');
    } finally {
      setIsLoading(false);
    }
  };

  const resetStates = () => {
    setSelectedImages([]);
    setIsMultipleSelect(false);
    setCurrentImageIndex(0);
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
      <View className="w-full mb-4">
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
              style={{ width: IMAGE_WIDTH }}
              className="items-center justify-center">
              <Image
                source={{ uri }}
                style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH }}
                resizeMode="cover"
                className="bg-muted"
              />
            </View>
          ))}
        </ScrollView>
        {selectedImages.length > 1 && (
          <View className="absolute bottom-4 w-full flex-row justify-center gap-2">
            {selectedImages.map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const onConfirm = async () => {
    setIsConfirmLoading(true);
    const attachments = await Promise.all(
      selectedImages.map(media =>
        uploadMedia({
          mediaUri: media,
          createAttachments: createAttachment,
          type: 'image',
          usage: 'post-media',
          alt: 'image file',
        }),
      ),
    ).then(a => a.filter(Boolean) as MediaAttachment[]);

    onSelect(attachments);
    setIsConfirmLoading(false);
    resetStates();
    bottomSheetClose(ref);
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1">
        <ScrollView className="flex-1 h-full max-h-[600px]">
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
          <View className="flex-row flex-wrap">
            {images.map(({ node: image }) => (
              <TouchableOpacity
                key={image.image.uri}
                className="w-1/3 aspect-square p-0.5"
                onPress={() => handleImageSelection(image.image.uri)}>
                <View className="relative w-full h-full">
                  <Image
                    source={{ uri: image.image.uri }}
                    className="w-full h-full"
                  />

                  {selectedImages.includes(image.image.uri) && (
                    <View className="absolute z-50 inset-0">
                      <View className="absolute inset-0 bg-primary/20" />
                      {isMultipleSelect && (
                        <View className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-white items-center justify-center">
                          <CheckIcon className="text-black" size={18} />
                        </View>
                      )}
                      <View className="absolute inset-0 border-2 border-primary" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <SheetFooter
          onCancel={() => {
            resetStates();
            bottomSheetClose(ref);
          }}
          onConfirm={onConfirm}
          disabled={selectedImages.length === 0 || isLoading}
          confirmText={t('common.done')}
          isLoading={isConfirmLoading}
        />
      </View>
    </BaseSheet>
  );
});
