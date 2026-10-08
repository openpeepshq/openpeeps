import React from 'react';
import { PublicPost } from '@openpeepshq/common';
import { isUnreadPostForViewer, useOpenpeeps } from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';

import { UpdatingDate } from '~/components/custom/date';
import { ProfileAvatar } from '~/components/profile';
import { MainStackParamList } from '~/components/navigation/types';
import { PostActions, PostMenu, UnreadPostIndicator } from '../../pieces';
import { ThemedView } from '~/components/ui/themed-view';
import { usePostViewRef } from '~/hooks/use-post-view-ref';

import { ProfileHandle, ProfileName } from '~/components/profile';
import { FeedPostContent } from '~/components/post';
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
    <ThemedView ref={postViewRef} className="relative flex-row py-5 px-4 gap-3">
      <UnreadPostIndicator show={isUnread && !noActions} />
      {isChild && (
        <ThemedView className="absolute left-[39px] top-0 h-8 w-px bg-input" />
      )}

      {isParent && (
        <ThemedView className="absolute bottom-0 left-[39px] top-8 w-px bg-input" />
      )}

      <Pressable
        onPress={() =>
          navigation.navigate('Profile', { handle: post.profile.handle })
        }
      >
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
