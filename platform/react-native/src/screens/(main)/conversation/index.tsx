import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MainScreenProps } from '~/components/navigation/types';
import {
  adjustUnseenCounts,
  useOpenpeeps,
  usePostViewFlush,
} from '@openpeepshq/react';
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
  TextInput,
} from 'react-native';
import {
  InfoIcon,
  SendHorizonalIcon,
} from '~/components/icons';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { MediaAttachmentData } from '@openpeepshq/common';
import { MediaPreview } from '~/components/custom/post/post-form/MediaPreview';
import { DropdownMenu } from '~/components/ui/dropdown-menu';
import {
  ConversationProfileHeader,
  MessageCard,
} from '~/components/custom/conversations';

type ConversationProps = MainScreenProps<'Conversation'>;

export const Conversation = ({ route, navigation }: ConversationProps) => {
  const { id } = route.params;
  const { openpeepsApi, currentProfile, queryClient, client } = useOpenpeeps();
  const { data: messages, isLoading } = openpeepsApi.useConversation(id);
  const markPostsSeen = openpeepsApi.markPostsSeenAction();
  const flushPostViews = usePostViewFlush();
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachmentData[]>([]);
  const [content, setContent] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = openpeepsApi.createConversationPostAction({ id });

  const resetForm = useCallback(() => {
    setContent('');
    setAttachments([]);
  }, []);

  const handleSendMessage = async () => {
    if (!content.trim()) {
      return;
    }

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

  useEffect(() => {
    if (!id) return;
    adjustUnseenCounts(queryClient, client, { clearConversation: id });
    void flushPostViews();
    return () => {
      void flushPostViews();
    };
  }, [id, client, queryClient, flushPostViews]);

  useEffect(() => {
    if (!id || !currentProfile || isLoading || !messages) return;
    const unseenIds = messages
      .filter(m => m.seen === false && m.profile.id !== currentProfile.id)
      .map(m => m.id);
    if (unseenIds.length === 0) return;
    void markPostsSeen({ postIds: unseenIds });
  }, [id, currentProfile, messages, isLoading, markPostsSeen]);

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
            rightButtonIcon={
              <InfoIcon size={20} className="text-foreground" />
            }
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
                  removeAttachment={index => {
                    setAttachments(attachments.filter((_, i) => i !== index));
                  }}
                  updateAttachment={(index, attachment) => {
                    setAttachments(
                      attachments.map((a, i) =>
                        i === index ? attachment : a,
                      ),
                    );
                  }}
                />
              )}
              <View className="flex-row items-center px-4 py-3 bg-background border-t border-border">
                <TextInput
                  className="flex-1 mx-4 text-foreground"
                  placeholder="Message..."
                  placeholderTextColor="#666"
                  multiline
                  value={content}
                  onChangeText={setContent}
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={isSending}
                  className={`p-2 rounded-full ${
                    content.trim() ? 'bg-primary' : 'bg-muted'
                  }`}>
                  {isSending ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <SendHorizonalIcon />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </DropdownMenu>
      </View>
    </ThemedSafeAreaView>
  );
};
