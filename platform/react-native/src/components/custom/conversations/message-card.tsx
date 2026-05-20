import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { PublicPost } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { ThemedText } from '~/components/ui/themed-text';
import { ThemedView } from '~/components/ui/themed-view';
import { FeedPostContent, UpdatingDate } from '~/components/custom';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MessageOptionsSheet, DeleteMessageConfirmationSheet } from '../modals';

interface MessageCardProps {
  message: PublicPost;
}

export const MessageCard = ({ message }: MessageCardProps) => {
  const [post, setPost] = useState<PublicPost>(message);
  const deleteMessageModalRef = useRef<BottomSheetModal>(null);
  const messageOptionsRef = useRef<BottomSheetModal>(null);
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const isCurrentUser = post.profile.id === currentProfile?.id;
  const reactToPost = openpeepsApi.reactToPostAction({
    id: post.id,
  });
  // const retractReaction = openpeepsApi.retractPostReactionAction({
  //   id: post.id,
  // });
  const deleteMessage = openpeepsApi.deletePostAction({
    id: post.id,
  });

  const refetchPost = openpeepsApi.usePost(post.id);

  const likeCount = post?.reactions.length;

  // const checkOwnReaction = () => {
  //   return post.reactions?.some(r => r.profile.id === currentProfile?.id);
  // };

  // const handleReact = () => {
  //   if (checkOwnReaction()) {
  //     // Optimistically remove current user's reaction
  //     setPost(prev => ({
  //       ...prev,
  //       reactions: prev.reactions.filter(
  //         r => r.profile.id !== currentProfile?.id
  //       ),
  //     }));

  //     // Call API to retract reaction, then refetch post to sync
  //     retractReaction().then(() => {
  //       refetchPost.refetch().then(data => {
  //         if (data.data) { setPost(data.data); }
  //       });
  //     });
  //   } else {
  //     if (!currentProfile) { return; } // safety check

  //     // Optimistically add current user's reaction
  //     setPost(prev => ({
  //       ...prev,
  //       reactions: [
  //         ...prev.reactions,
  //         {
  //           id: 'temp-id', // temporary id until server responds
  //           profile: currentProfile,
  //           reaction: '👍',
  //           createdAt: new Date().toISOString(),
  //         },
  //       ],
  //     }));

  //     // Call API to add reaction, then refetch post to sync
  //     reactToPost({ reaction: '👍' }).then(() => {
  //       refetchPost.refetch().then(data => {
  //         if (data.data) { setPost(data.data); }
  //       });
  //     });
  //   }
  // };


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
        className={`flex flex-row w-full 
            ${likeCount > 0 ? 'mb-8' : 'mb-4'}
            ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <View
          className={`min-w-[30%] max-w-[80%] ${isCurrentUser ? 'items-end' : 'items-start'
            }`}>
          {!isCurrentUser && (
            <ThemedText className="text-sm text-muted-foreground ml-2 mb-1">
              {post.profile.displayName || post.profile.handle}
            </ThemedText>
          )}
          <ThemedView
            className={`px-4 rounded-t-2xl relative ${isCurrentUser
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
          {/* <View className="flex-row items-center">
            <Button
              variant={'ghost'}
              onPress={handleReact}
              size={'icon'}
              className="flex-row items-center">
              <ThumbsUpIcon
                size={16}
                className={`${likeCount > 0 ? 'text-pink-500' : 'text-primary'
                  }`}
              />
              {likeCount > 1 && <Text>{likeCount - 1}</Text>}
            </Button>
          </View> */}
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
