import React from 'react';
import { TouchableOpacity } from 'react-native';
import { UpdatingDate } from '../../date/updating-date';
import { PostMenu } from './PostMenu';
import { type PublicPost } from '@openpeeps/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../../navigation/types';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { ProfileHandle, ProfileName } from '../../common/profile-pieces';
import { ThemedView } from '../../../ui/themed-view';

interface PostHeaderProps {
  post: PublicPost;
  showMenu?: boolean;
}

export const PostHeader = ({ post, showMenu = true }: PostHeaderProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <ThemedView className="flex-row mt-3 mb-5 px-5 justify-between items-center">
      <ThemedView className="flex-row gap-3">
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Profile', {
              handle: post.profile.handle as string,
            })
          }>
          <ProfileAvatar profile={post.profile} className="size-14" />
        </TouchableOpacity>
        <ThemedView>
          <ProfileName profile={[post.profile]} />
          <ProfileHandle profile={[post.profile]} />
          <UpdatingDate date={post.createdAt as string} />
        </ThemedView>
      </ThemedView>
      {showMenu && <PostMenu post={post} />}
    </ThemedView>
  );
};
