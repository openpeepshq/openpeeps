import React, { forwardRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '~/components/ui/button';
import { CameraIcon, FilmIcon } from '~/components/icons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { BaseSheet } from '../common';
import { useTranslation } from 'react-i18next';
import { MediaAttachment } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { uploadMedia } from '~/lib/uploadMedia';
import { bottomSheetClose } from '~/lib/bottom-sheet-ref';

interface VideoPickerSheetProps {
  onSelect: (videoAttachments: MediaAttachment[]) => void | Promise<void>;
}

// Videos are selected via the system photo picker (launchImageLibrary), which
// needs no broad media permissions and keeps the app compliant with Google
// Play's photo & video permission policy.
export const VideoPickerSheet = forwardRef<
  BottomSheetModal,
  VideoPickerSheetProps
>(({ onSelect }, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();

  const finalize = async (uris: string[]) => {
    if (uris.length === 0) {
      return;
    }
    setIsLoading(true);
    try {
      const videoAttachments = await Promise.all(
        uris.map(uri =>
          uploadMedia({
            mediaUri: uri,
            createAttachments: createAttachment,
            type: 'video',
            usage: 'post_media',
            alt: 'Video attachment',
          }),
        ),
      ).then(attachments => attachments.filter(Boolean) as MediaAttachment[]);
      await onSelect(videoAttachments);
    } finally {
      setIsLoading(false);
      bottomSheetClose(ref);
    }
  };

  const handleLibrary = async () => {
    const result = await launchImageLibrary({
      mediaType: 'video',
      selectionLimit: 0,
    });
    if (result.didCancel || !result.assets?.length) {
      return;
    }
    const uris = result.assets
      .map(asset => asset.uri)
      .filter((uri): uri is string => Boolean(uri));
    await finalize(uris);
  };

  const handleCamera = async () => {
    const result = await launchCamera({ mediaType: 'video', quality: 1 });
    if (result.didCancel) {
      return;
    }
    const uri = result.assets?.[0]?.uri;
    if (!uri) {
      return;
    }
    await finalize([uri]);
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
            {t('common.media.video.recordVideo')}
          </Text>
        </Button>
        <Button
          variant="outline"
          className="flex-row items-center justify-center gap-2"
          onPress={handleLibrary}
          disabled={isLoading}>
          <FilmIcon size={18} className="text-foreground" />
          <Text className="text-foreground text-base font-medium">
            {t('common.media.video.chooseFromLibrary')}
          </Text>
        </Button>
        {isLoading && <ActivityIndicator className="mt-2" />}
      </View>
    </BaseSheet>
  );
});
