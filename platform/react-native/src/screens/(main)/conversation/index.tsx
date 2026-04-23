import React, { useCallback, useRef, useState } from 'react';
import { MainScreenProps } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';
import {
  GenericHeader,
  ProfileBio,
  ProfileHandle,
  ProfileImages,
  ProfileName,
} from '~/components/custom';
import {
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { TextInput } from 'react-native';
import {
  InfoIcon,
  SendHorizonalIcon,
} from '~/components/icons';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { MediaAttachmentData } from '@openpeeps/common';
import { MediaPreview } from '~/components/custom/post/post-form/MediaPreview';
import { DropdownMenu } from '~/components/ui/dropdown-menu';
import { ConversationProfileHeader, MessageCard } from '~/components/custom/conversations';

type ConversationProps = MainScreenProps<'Conversation'>;

export const Conversation = ({ route, navigation }: ConversationProps) => {
  const { id } = route.params;
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { data: messages } = openpeepsApi.useConversation(id);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachmentData[]>([]);
  const [content, setContent] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  // const imagePickerModalRef = useRef<BottomSheetModal>(null);
  // const videoPickerModalRef = useRef<BottomSheetModal>(null);

  const sendMessage = openpeepsApi.createConversationPostAction({ id });

  // const handleImageModalPress = useCallback(() => {
  //   imagePickerModalRef.current?.present();
  // }, []);

  // const handleVideoModalPress = useCallback(() => {
  //   videoPickerModalRef.current?.present();
  // }, []);

  // const handleAddAttachments = useCallback((attachments: MediaAttachmentData[]) => {
  //   setAttachments(prev => [...prev, ...attachments]);
  // }, []);

  const resetForm = useCallback(() => {
    setContent('');
    setAttachments([]);
  }, []);

  const handleSendMessage = async () => {
    if (!content.trim()) { return; }

    try {
      setIsSending(true);
      const lastMessage = messages?.slice(-1)[0];
      await sendMessage({
        visibility: 'direct',
        audience: lastMessage?.audience,
        type: 'note',
        data: {
          type: 'note',
          content: content,
          // attachments: attachments,
        },
      });
      resetForm();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ThemedSafeAreaView style={{ flex: 1 }}>
      <View className="flex-1">
      <DropdownMenu>
        <GenericHeader
          title={
            <ConversationProfileHeader
              participants={
                messages?.[0]?.audience?.length === 2
                  ? messages?.[0]?.audience?.filter(
                    p => p.id !== currentProfile?.id,
                  ) || []
                  : messages?.[0]?.audience || []
              }
            />

          }
          rightType="icon"
          rightButtonIcon={<InfoIcon size={20} className="text-foreground" />}
          onRightButtonPress={() =>
            navigation.navigate('ConversationInfo', { id: id })
          }
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 pb-44"
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }>
            {messages?.[0]?.audience?.length === 2 && (
              <View className="bg-background border-b border-border">
                <View className="flex items-center justify-center py-6">
                  <ProfileImages
                    profile={
                      messages?.[0].audience.filter(
                        p => p.id !== currentProfile?.id,
                      ) || []
                    }
                  />
                  <ProfileName
                    profile={
                      messages?.[0].audience.filter(
                        p => p.id !== currentProfile?.id,
                      ) || []
                    }
                  />
                  <ProfileHandle
                    profile={
                      messages?.[0].audience.filter(
                        p => p.id !== currentProfile?.id,
                      ) || []
                    }
                  />
                  <ProfileBio
                    profile={
                      messages?.[0].audience.filter(
                        p => p.id !== currentProfile?.id,
                      ) || []
                    }
                  />
                </View>
              </View>
            )}

            {messages?.map((message, idx) => (
              <View key={idx} className="mt-4 px-2">
                <MessageCard message={message} />
              </View>
            ))}
          </ScrollView>

          <View>
            {attachments.length > 0 && (
              <MediaPreview
                attachments={attachments}
                removeAttachment={(index) => {
                  setAttachments(attachments.filter((_, i) => i !== index));
                }}
                updateAttachment={(index, attachment) => {
                  setAttachments(attachments.map((a, i) => i === index ? attachment : a));
                }}
              />
            )}
            <View className="flex-row items-center px-4 py-3 bg-background border-t border-border">
              {/* <DropdownMenuTrigger asChild>
                <PlusIcon className="text-foreground" />
              </DropdownMenuTrigger> */}
              <TextInput
                className="flex-1 mx-4 text-foreground"
                placeholder="Message..."
                placeholderTextColor="#666"
                multiline
                value={content}
                onChangeText={setContent}
                maxLength={500}
              />
              {/* TODO remove when mic is implemented */}
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={isSending}>
                {isSending ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <SendHorizonalIcon className="text-foreground -rotate-45" />
                )}
              </TouchableOpacity>

              {/* TODO uncomment when mic is implemented */}
              {/* {content.trim() ? (
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={isSending}>
                  {isSending ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <SendHorizonalIcon className="text-foreground -rotate-45" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity>
                  <MicIcon className="text-foreground" />
                </TouchableOpacity>
              )} */}
            </View>
          </View>
        </KeyboardAvoidingView>
        {/*
        <DropdownMenuContent side="top">
          <DropdownMenuItem onPress={handleImageModalPress}>
            <ImageIcon size={18} className=" mr-2 text-foreground" />
            <Text>Image</Text>
          </DropdownMenuItem>

          <DropdownMenuItem onPress={handleVideoModalPress}>
            <FilmIcon size={18} className="mr-2 text-foreground" />
            <Text>Video</Text>
          </DropdownMenuItem>
        </DropdownMenuContent> */}
      </DropdownMenu>
      </View>
      {/* <ImagePickerSheet
        ref={imagePickerModalRef}
        onSelect={handleAddAttachments}
      />
      <VideoPickerSheet
        ref={videoPickerModalRef}
        onSelect={handleAddAttachments}
      /> */}
    </ThemedSafeAreaView>
  );
};
