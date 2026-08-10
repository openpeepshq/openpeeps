import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { PublicPost } from '@openpeepshq/common';
import { isUnreadPostForViewer, useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';
import { FeedPostContent, UpdatingDate } from '~/components/custom';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  MessageOptionsSheet,
  DeleteMessageConfirmationSheet,
} from '../modals';
import { UnreadPostIndicator } from '../post/pieces/UnreadPostIndicator';

interface MessageCardProps {
  message: PublicPost;
}

export const MessageCard = ({ message }: MessageCardProps) => {
  const [post, setPost] = useState<PublicPost>(message);
  const deleteMessageModalRef = useRef<BottomSheetModal>(null);
  const messageOptionsRef = useRef<BottomSheetModal>(null);
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const isCurrentUser = post.profile.id === currentProfile?.id;
  const isUnread = isUnreadPostForViewer(post, currentProfile?.id);
  const deleteMessage = openpeepsApi.deletePostAction({
    id: post.id,
  });

  const refetchPost = openpeepsApi.usePost(post.id);

  const likeCount = post?.reactions.length;

  React.useEffect(() => {
    setPost(message);
  }, [message]);

  const handleDeleteGroupModalPress = useCallback(() => {
    deleteMessageModalRef.current?.present();
  }, []);

  const handleDelete = async () => {
    await deleteMessage();
    const response = await refetchPost.refetch();
    response.data && setPost(response.data);
  };

  return (
    <>
      <View
        className={`flex flex-row w-full relative
            ${likeCount > 0 ? 'mb-8' : 'mb-4'}
            ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        {!isCurrentUser && <UnreadPostIndicator show={isUnread} />}
        <View
          className={`min-w-[30%] max-w-[80%] ${
            isCurrentUser ? 'items-end' : 'items-start'
          }`}>
          {!isCurrentUser && (
            <ThemedText className="text-sm text-muted-foreground ml-2 mb-1">
              {post.profile.displayName || post.profile.handle}
            </ThemedText>
          )}
          <ThemedView
            className={`px-4 rounded-t-2xl relative ${
              isCurrentUser
                ? 'bg-secondary/60 rounded-bl-2xl'
                : 'bg-secondary/20 rounded-br-2xl'
            }`}>
            <View className="w-full px-4 pt-2 items-center flex-row justify-between">
              <UpdatingDate date={post.createdAt as string} />
            </View>
            <View className="pb-4">
              <FeedPostContent post={post} />
            </View>
          </ThemedView>
        </View>
      </View>

      <MessageOptionsSheet
        ref={messageOptionsRef}
        message={post.data?.content || ''}
        isCurrentUser={isCurrentUser}
        onDelete={() => console.log('Delete for you')}
        onDeleteForEveryone={handleDeleteGroupModalPress}
      />

      <DeleteMessageConfirmationSheet
        ref={deleteMessageModalRef}
        onDelete={handleDelete}
        message={post}
      />
    </>
  );
};

export const SingleMessagePreviewCard = ({ message }: MessageCardProps) => {
  return (
    <View className="flex flex-row w-full mb-4 justify-end">
      <View className="min-w-[30%] max-w-[80%] items-end">
        <ThemedText className="text-sm text-muted-foreground ml-2 mb-1">
          {message.profile.displayName || message.profile.handle}
        </ThemedText>
        <ThemedView className="px-4 py-3 rounded-t-2xl relative bg-primary rounded-bl-2xl">
          <ThemedText className="text-base text-primary-foreground">
            {message.data?.content}
          </ThemedText>
          <ThemedText className="text-xs mt-1 text-primary-foreground/70">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </ThemedText>
          {message.reactions.length > 0 && (
            <View
              className={
                'rounded-full absolute -bottom-4 bg-primary p-1 right-3'
              }>
              <Text>👍🏽</Text>
              {message.reactions.length > 1 && (
                <Text>{message.reactions.length - 1}</Text>
              )}
            </View>
          )}
        </ThemedView>
      </View>
    </View>
  );
};
