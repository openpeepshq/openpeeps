import React, { useRef } from 'react';
import { Image, Pressable, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { MediaAttachment } from '@openpeepshq/common';
import { ImagePickerSheet } from '../custom/modals/media/index';
import { CameraIcon, XIcon } from '../icons/index';
import { Avatar, AvatarImage } from '../ui/avatar';
import { ThemedText } from '../ui/themed-text';
import { bottomSheetPresent } from '../../lib/bottom-sheet-ref';

export interface HeaderAvatarInputProps {
  header?: string;
  avatar?: string;
  onHeaderChange: (url: string | null) => void;
  onAvatarChange: (url: string | null) => void;
  /** Upload usage tags; groups and profiles store images under different tags. */
  usage?: { header: string; avatar: string };
}

/**
 * Cover banner with the round avatar picker overhanging its lower-left
 * corner. Images upload on pick and the resulting URLs are reported up.
 */
export const HeaderAvatarInput = ({
  header,
  avatar,
  onHeaderChange,
  onAvatarChange,
  usage = { header: 'header-image', avatar: 'avatar-image' },
}: HeaderAvatarInputProps) => {
  const { t } = useTranslation();
  const headerSheetRef = useRef<BottomSheetModal>(null);
  const avatarSheetRef = useRef<BottomSheetModal>(null);

  const firstUrl = (images: MediaAttachment[]) =>
    images[0]?.url ?? images[0]?.previewUrl ?? null;

  return (
    <View className="relative mb-16 w-full">
      <Pressable
        onPress={() => bottomSheetPresent(headerSheetRef)}
        className="w-full aspect-[3/1] rounded-md overflow-hidden bg-muted items-center justify-center"
      >
        {header ? (
          <Image
            source={{ uri: header }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
        ) : null}
        <View className="flex-row gap-x-2">
          <View className="bg-black/40 p-2 rounded-full">
            <CameraIcon className="text-white" />
          </View>
          {header ? (
            <Pressable
              onPress={() => onHeaderChange(null)}
              className="bg-black/40 p-2 rounded-full"
            >
              <XIcon className="text-white" />
            </Pressable>
          ) : null}
        </View>
        {!header ? (
          <ThemedText className="text-xs text-muted-foreground mt-2">
            {t('form.headerAvatarInput.coverImage', {
              defaultValue: 'Cover image',
            })}
          </ThemedText>
        ) : null}
      </Pressable>

      <View className="absolute -bottom-12 left-4">
        <Pressable onPress={() => bottomSheetPresent(avatarSheetRef)}>
          <Avatar alt="avatar" className="size-28 bg-muted">
            {avatar ? <AvatarImage source={{ uri: avatar }} /> : null}
          </Avatar>
          <View className="absolute bottom-0 right-0 flex-row gap-x-1">
            <View className="bg-black/40 p-2 rounded-full">
              <CameraIcon size={16} className="text-white" />
            </View>
            {avatar ? (
              <Pressable
                onPress={() => onAvatarChange(null)}
                className="bg-black/40 p-2 rounded-full"
              >
                <XIcon size={16} className="text-white" />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </View>

      <ImagePickerSheet
        ref={headerSheetRef}
        usage={usage.header}
        onSelect={(images) => onHeaderChange(firstUrl(images))}
      />
      <ImagePickerSheet
        ref={avatarSheetRef}
        usage={usage.avatar}
        onSelect={(images) => onAvatarChange(firstUrl(images))}
      />
    </View>
  );
};
