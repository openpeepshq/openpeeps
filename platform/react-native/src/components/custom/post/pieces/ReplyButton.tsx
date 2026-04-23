import { View, Pressable } from 'react-native';
import React from 'react';
import { PublicPost } from '@openpeeps/common';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useOpenpeeps } from '@openpeeps/react';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { ImageIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
interface ReplyButtonProps {
  post: PublicPost;
}

export const ReplyButton = ({ post }: ReplyButtonProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { currentProfile } = useOpenpeeps();

  return (
    currentProfile && <Pressable
      onPress={() => navigation.navigate('ReplyPost', { id: post.id })}
      className="flex w-full flex-row items-center gap-x-2 border-border p-4">
      <ProfileAvatar profile={currentProfile} />
      <View className="flex-row items-center flex-1 rounded-full border border-border px-4 py-3">
        <ThemedText className="">Add a reply...</ThemedText>
        <ImageIcon size={20} className="ml-2 text-muted-foreground" />
      </View>
    </Pressable>
  ) || null;
};
