import React from 'react';
import { MediaAttachmentData, PublicProfile } from '@openpeepshq/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';
import { CachedImage } from '~/components/custom/common';
import { MainStackParamList } from '~/components/navigation/types';
import { VideoPlayOverlay } from '../../VideoPlayOverlay';

interface GalleryVideoProps {
  attachment: MediaAttachmentData;
  profile: PublicProfile;
}

export const GalleryVideo = ({ attachment, profile }: GalleryVideoProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  return (
    <Pressable
      accessibilityRole="button"
      className="size-full relative"
      onPress={() =>
        navigation.push('VideoPlayer', {
          url: attachment.url,
          title: profile.displayName,
        })
      }
    >
      {attachment.previewUrl && (
        <CachedImage
          url={attachment.previewUrl ?? ''}
          className="size-full"
          resizeMode="cover"
        />
      )}
      <VideoPlayOverlay video />
    </Pressable>
  );
};
