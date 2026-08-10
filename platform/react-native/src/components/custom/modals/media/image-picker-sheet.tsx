import React, { forwardRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '~/components/ui/button';
import { CameraIcon, ImageIcon } from '~/components/icons';
import ImagePicker from 'react-native-image-crop-picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { MediaAttachment } from '@openpeepshq/common';
import { uploadMedia } from '~/lib/uploadMedia';
import { useOpenpeeps } from '@openpeepshq/react';
import Toast from 'react-native-toast-message';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';
import { BaseSheet } from '../common';
import { bottomSheetClose } from '~/lib/bottom-sheet-ref';
import {
  dismissSheetForNativeModal,
  isPickerCancelled,
  toCropperPath,
} from '~/lib/mediaUriHelpers';

interface ImagePickerSheetProps {
  onSelect: (images: MediaAttachment[]) => void;
}

// Media is selected via the Android system photo picker / iOS picker
// (launchImageLibrary), which needs no broad media permissions and keeps the
// app compliant with Google Play's photo & video permission policy.
export const ImagePickerSheet = forwardRef<
  BottomSheetModal,
  ImagePickerSheetProps
>(({ onSelect }, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();
  const { colors, isDark } = useOpenPeepsTheme();

  const cropImage = async (uri: string) => {
    const path = await toCropperPath(uri);
    return ImagePicker.openCropper(
      Platform.OS === 'android'
        ? { path, width: 1000, height: 1000, mediaType: 'photo' }
        : {
            path,
            width: 1000,
            height: 1000,
            cropperToolbarTitle: t('form.imageEditModal.title'),
            cropperToolbarColor: colors.background,
            mediaType: 'photo',
            cropperStatusBarLight: !isDark,
            cropperToolbarWidgetColor: colors.foreground,
          },
    );
  };

  const finalize = async (uris: string[]) => {
    if (uris.length === 0) {
      return;
    }
    setIsLoading(true);
    try {
      const attachments = await Promise.all(
        uris.map(uri =>
          uploadMedia({
            mediaUri: uri,
            createAttachments: createAttachment,
            type: 'image',
            usage: 'post-media',
            alt: 'image file',
          }),
        ),
      ).then(a => a.filter(Boolean) as MediaAttachment[]);
      onSelect(attachments);
    } finally {
      setIsLoading(false);
      bottomSheetClose(ref);
    }
  };

  const handleLibrary = async () => {
    await dismissSheetForNativeModal(ref);

    if (Platform.OS === 'ios') {
      try {
        const picked = await ImagePicker.openPicker({
          width: 1000,
          height: 1000,
          cropping: true,
          mediaType: 'photo',
          cropperToolbarTitle: t('form.imageEditModal.title'),
          cropperToolbarColor: colors.background,
          cropperStatusBarLight: !isDark,
          cropperToolbarWidgetColor: colors.foreground,
        });
        await finalize([picked.path]);
      } catch (error) {
        if (!isPickerCancelled(error)) {
          console.error('iOS library pick failed:', error);
        }
      }
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 0,
      quality: 1,
    });
    if (result.didCancel || !result.assets?.length) {
      return;
    }
    const uris = result.assets
      .map(asset => asset.uri)
      .filter((uri): uri is string => Boolean(uri));
    if (uris.length === 1) {
      try {
        const cropped = await cropImage(uris[0]);
        await finalize([cropped.path]);
      } catch (error) {
        if (isPickerCancelled(error)) {
          return;
        }
        await finalize(uris);
      }
      return;
    }
    await finalize(uris);
  };

  const handleCamera = async () => {
    try {
      await dismissSheetForNativeModal(ref);
      if (Platform.OS === 'android') {
        const result = await ImagePicker.openCamera({
          width: 1000,
          height: 1000,
          cropping: true,
          mediaType: 'photo',
        });
        await finalize([result.path]);
        return;
      }
      const result = await launchCamera({ mediaType: 'photo', quality: 1 });
      if (result.errorCode) {
        Toast.show({ type: 'error', text1: t('form.imageInput.camera.error') });
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        return;
      }
      try {
        const cropped = await cropImage(uri);
        await finalize([cropped.path]);
      } catch (error) {
        if (isPickerCancelled(error)) {
          return;
        }
        await finalize([uri]);
      }
    } catch (error) {
      if (!isPickerCancelled(error)) {
        console.error('Camera pick failed:', error);
      }
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className="px-4 py-3 gap-3">
        <Button
          variant="outline"
          className="flex-row items-center justify-center gap-2"
          onPress={handleCamera}
          disabled={isLoading}>
          <CameraIcon size={18} className="text-foreground" />
          <Text className="text-foreground text-base font-medium">
            {t('common.media.image.takePhoto')}
          </Text>
        </Button>
        <Button
          variant="outline"
          className="flex-row items-center justify-center gap-2"
          onPress={handleLibrary}
          disabled={isLoading}>
          <ImageIcon size={18} className="text-foreground" />
          <Text className="text-foreground text-base font-medium">
            {t('common.media.image.chooseFromLibrary')}
          </Text>
        </Button>
        {isLoading && <ActivityIndicator className="mt-2" />}
      </View>
    </BaseSheet>
  );
});
