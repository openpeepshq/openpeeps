import { TouchableWithoutFeedback, View } from 'react-native';
import { MessageSquareIcon } from '../../../icons';
import { type PublicPost } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { ThemedText } from '../../../ui/themed-text';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { profileName, truncateText } from '../../../../lib/utils';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { PostMenu } from './PostMenu';

interface PostReactionHeaderProps {
  post: PublicPost;
  inGroup?: boolean;
  hideReply?: boolean;
  previewMode?: boolean;
}

export const PostReactionHeader = ({
  post,
  inGroup = false,
  hideReply = false,
  previewMode = false,
}: PostReactionHeaderProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const {
    data: replypost,
    isError,
    isLoading: isReplyLoading,
  } = openpeepsApi.usePost(post.inReplyToId as string);
  const {
    data: group,
    isError: isGroupError,
    isLoading: isGroupLoading,
  } = openpeepsApi.useGroup(post.groupId as string);

  const showReply = post.inReplyToId && !hideReply && !isError;
  const showGroup = post.groupId && group && !isGroupError && !inGroup;
  const showRepost = !!post.repost;

  return (
    <>
      {!isGroupLoading && !isReplyLoading && (
        <>
          {(showReply || showGroup) && (
            <View className="px-5">
              <View className="flex-row items-center border-b border-border pb-5 justify-between gap-2 mb-2">
                <View className="flex-row items-center gap-2 flex-1 flex-wrap">
                  {showReply && (
                    <>
                      <MessageSquareIcon
                        size={18}
                        className="text-foreground"
                      />
                      <ThemedText className="truncate">
                        {truncateText(
                          profileName(post?.profile),
                          showGroup ? 10 : 20,
                        )}
                      </ThemedText>

                      <ThemedText className="text-muted-foreground">
                        {t('posts.replyTo')}
                      </ThemedText>
                      <ThemedText className="truncate">
                        {truncateText(
                          profileName(replypost?.profile),
                          showGroup ? 10 : 20,
                        )}
                      </ThemedText>
                    </>
                  )}

                  {showGroup && (
                    <>
                      {showReply && (
                        <ThemedText className="text-muted-foreground">
                          in
                        </ThemedText>
                      )}
                      {!showReply && (
                        <ThemedText className="text-muted-foreground">
                          Posted in
                        </ThemedText>
                      )}
                      <ThemedText className="truncate">
                        {truncateText(group.displayName, showReply ? 10 : 20)}
                      </ThemedText>
                    </>
                  )}
                </View>
                {!previewMode && <PostMenu post={post} />}
              </View>
            </View>
          )}

          {showRepost && (
            <View className="px-5">
              <View className="flex-row items-center border-b border-border pb-5 justify-between gap-2 mb-2">
                <View className="flex-row items-center gap-2 flex-1 flex-wrap">
                  <TouchableWithoutFeedback onPress={() => { }}>
                    <ProfileAvatar profile={post.profile} className="size-8" />
                  </TouchableWithoutFeedback>
                  <ThemedText className="truncate">
                    {profileName(post.profile)}
                  </ThemedText>
                  <ThemedText className="text-muted-foreground">
                    reposted this
                  </ThemedText>
                </View>
                {!previewMode && <PostMenu post={post} />}
              </View>
            </View>
          )}
        </>
      )}
    </>
  );
};
