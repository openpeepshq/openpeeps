import React from 'react';
import { PublicPost } from '@openpeepshq/common';
import { isUnreadPostForViewer, useOpenpeeps } from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';
import { ProfileHandle, ProfileName } from '~/components/custom/common';
import { UpdatingDate } from '~/components/custom/date';
import { ProfileAvatar } from '~/components/custom/profile';
import { MainStackParamList } from '~/components/navigation/types';
import {
  FeedPostContent,
  PostActions,
  PostMenu,
  UnreadPostIndicator,
} from '../../pieces';
import { ThemedView } from '~/components/ui/themed-view';
import { usePostViewRef } from '~/hooks/use-post-view-ref';

interface ThreadPostProps {
  post: PublicPost;
  isParent?: boolean;
  isChild?: boolean;
  noActions?: boolean;
  noMenu?: boolean;
}

export const ThreadPost: React.FC<ThreadPostProps> = ({
  post,
  isParent = false,
  isChild = false,
  noActions = false,
  noMenu = false,
}: ThreadPostProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { currentProfile } = useOpenpeeps();
  const isUnread = isUnreadPostForViewer(post, currentProfile?.id);
  const postViewRef = usePostViewRef(post.id, {
    groupId: post.groupId,
    adjustUnread: isUnread && !noActions,
  });

  return (
    <ThemedView
      ref={postViewRef}
      className="relative flex-row py-5 px-4 gap-3">
      <UnreadPostIndicator show={isUnread && !noActions} />
      {isChild && (
        <ThemedView
          className="absolute bg-input"
          style={{
            width: 1,
            left: 39,
            top: 0,
            height: 32,
          }}
        />
      )}

      {isParent && (
        <ThemedView
          className="absolute bg-input w-1 h-full"
          style={{
            width: 1,
            left: 39,
            top: 32,
            bottom: 0,
          }}
        />
      )}

      <Pressable
        onPress={() =>
          navigation.navigate('Profile', { handle: post.profile.handle })
        }>
        <ProfileAvatar profile={post.profile} className="size-14" />
      </Pressable>

      <ThemedView className="flex-1 gap-2 mb-2">
        <ThemedView className="flex-row justify-between items-start">
          <ThemedView>
            <ProfileName profile={[post.profile]} />
            <ProfileHandle profile={[post.profile]} />
            <UpdatingDate date={post.createdAt as string} />
          </ThemedView>
          {!noMenu && <PostMenu post={post} />}
        </ThemedView>

        <FeedPostContent post={post} />

        {!noActions && <PostActions post={post} />}
      </ThemedView>
    </ThemedView>
  );
};
