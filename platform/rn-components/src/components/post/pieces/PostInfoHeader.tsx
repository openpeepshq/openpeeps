import React from 'react';
import { TouchableOpacity } from 'react-native';
import { UpdatingDate } from '../../custom/date/updating-date';
import { PostMenu } from './PostMenu';
import { type PublicPost } from '@openpeepshq/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types/index';
import { ProfileAvatar } from '../../profile/Avatar';
import { ProfileHandle, ProfileName } from '../../profile/ProfilePieces';
import { ThemedText } from '../../ui/themed-text';
import { ThemedView } from '../../ui/themed-view';

interface PostHeaderProps {
  post: PublicPost;
  showMenu?: boolean;
  deleteCallback?: () => void;
}

export const PostInfoHeader = ({
  post,
  showMenu = true,
  deleteCallback,
}: PostHeaderProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <ThemedView className="flex-row items-center justify-between py-2">
      <ThemedView className="flex-row gap-2">
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Profile', {
              handle: post.profile.handle as string,
            })
          }
        >
          <ProfileAvatar profile={post.profile} className="size-10" />
        </TouchableOpacity>
        <ThemedView>
          <ProfileName profile={[post.profile]} />
          <ThemedView className="flex-row items-center gap-1">
            <ProfileHandle profile={[post.profile]} />
            <ThemedText className="text-xs text-muted-foreground">·</ThemedText>
            <UpdatingDate date={post.createdAt as string} />
          </ThemedView>
        </ThemedView>
      </ThemedView>
      {showMenu && <PostMenu post={post} deleteCallback={deleteCallback} />}
    </ThemedView>
  );
};
