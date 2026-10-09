import React, { useRef } from 'react';
import { Image, Pressable, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { MediaAttachment } from '@openpeepshq/common';
import { ImagePickerSheet } from '../custom/modals/media/index';
import { CameraIcon, XIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { bottomSheetPresent } from '../../lib/bottom-sheet-ref';
import { cn } from '../../lib/utils';

export interface ImageInputProps {
  usage: string;
  url?: string;
  onChange: (url: string | undefined) => void;
  /** Bold call-to-action shown in the empty state. */
  text?: string;
  /** Smaller hint shown below the call-to-action. */
  specsText?: string;
  className?: string;
}

/**
 * Banner image picker: prompts for an upload when empty and shows the image
 * as a cover with replace/remove controls once set. Cropping is not available
 * natively; the picked file uploads as-is and the URL is reported up.
 */
export const ImageInput = ({
  usage,
  url,
  onChange,
  text,
  specsText,
  className,
}: ImageInputProps) => {
  const sheetRef = useRef<BottomSheetModal>(null);

  const onSelect = (images: MediaAttachment[]) => {
    const image = images[0]?.url ?? images[0]?.previewUrl;
    if (image) onChange(image);
  };

  return (
    <>
      <Pressable
        onPress={() => bottomSheetPresent(sheetRef)}
        className={cn(
          'w-full h-64 bg-muted items-center justify-center',
          className
        )}
      >
        {url ? (
          <Image
            source={{ uri: url }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
        ) : null}
        <View className="items-center gap-y-1">
          <View className="flex-row gap-x-2">
            <View className="bg-black/40 items-center justify-center rounded-full size-12">
              <CameraIcon className="text-white" />
            </View>
            {url ? (
              <Pressable
                onPress={() => onChange(undefined)}
                className="bg-black/40 items-center justify-center rounded-full size-12"
              >
                <XIcon className="text-white" />
              </Pressable>
            ) : null}
          </View>
          {!url && text ? (
            <ThemedText className="font-bold">{text}</ThemedText>
          ) : null}
          {!url && specsText ? (
            <ThemedText className="text-xs text-muted-foreground">
              {specsText}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      <ImagePickerSheet ref={sheetRef} usage={usage} onSelect={onSelect} />
    </>
  );
};
