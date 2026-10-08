import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MainScreenProps } from '~/components/navigation/types';
import {
  adjustUnseenCounts,
  useOpenpeeps,
  usePostViewFlush,
} from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { GenericHeader } from '~/components/custom';
import {
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { InfoIcon, SendHorizonalIcon } from '~/components/icons';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { MediaAttachmentData } from '@openpeepshq/common';
import { ComposeAttachments } from '~/components/post/post-form/ComposeAttachments';
import { OpenpeepsMarkdownInput } from '~/components/post/post-form/OpenpeepsMarkdownInput';
import { maxContentLength } from '~/lib/utils';
import { DropdownMenu } from '~/components/ui/dropdown-menu';
import {
  ConversationParticipantsModal,
  ConversationProfileHeader,
  MessageInThread,
} from '~/components/conversations';

import {
  ProfileBio,
  ProfileHandle,
  ProfileImages,
  ProfileName,
} from '~/components/profile';
type ConversationProps = MainScreenProps<'Conversation'>;

export const ConversationShow = ({ route, navigation }: ConversationProps) => {
  const { t } = useTranslation();
  const { id } = route.params;
  const { openpeepsApi, currentProfile, queryClient, client } = useOpenpeeps();
  const { data: messages, isLoading } = openpeepsApi.useConversation(id);
  const markPostsSeen = openpeepsApi.markPostsSeenAction();
  const flushPostViews = usePostViewFlush();
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachmentData[]>([]);
  const [content, setContent] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const sendMessage = openpeepsApi.createConversationPostAction({ id });
  const audience = messages?.[0]?.audience || [];
  const headerParticipants =
    audience.length === 2
      ? audience.filter((p) => p.id !== currentProfile?.id)
      : audience;
  const isGroupChat = audience.length > 2;

  const resetForm = useCallback(() => {
    setContent('');
    setAttachments([]);
  }, []);

  const handleSendMessage = async () => {
    if (!content.trim() || content.length > maxContentLength) {
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
      .filter((m) => m.seen === false && m.profile.id !== currentProfile.id)
      .map((m) => m.id);
    if (unseenIds.length === 0) return;
    void markPostsSeen({ postIds: unseenIds });
  }, [id, currentProfile, messages, isLoading, markPostsSeen]);

  return (
    <ThemedSafeAreaView className="flex-1">
      <View className="flex-1">
        <DropdownMenu>
          <GenericHeader
            title={
              <ConversationProfileHeader
                participants={headerParticipants}
                onPress={
                  isGroupChat ? () => setParticipantsOpen(true) : undefined
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
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 pb-44"
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {messages?.[0]?.audience?.length === 2 && (
                <View className="bg-background border-b border-border">
                  <View className="flex items-center justify-center py-6">
                    <ProfileImages
                      profile={
                        messages?.[0].audience.filter(
                          (p) => p.id !== currentProfile?.id
                        ) || []
                      }
                    />
                    <ProfileName
                      profile={
                        messages?.[0].audience.filter(
                          (p) => p.id !== currentProfile?.id
                        ) || []
                      }
                    />
                    <ProfileHandle
                      profile={
                        messages?.[0].audience.filter(
                          (p) => p.id !== currentProfile?.id
                        ) || []
                      }
                    />
                    <ProfileBio
                      profile={
                        messages?.[0].audience.filter(
                          (p) => p.id !== currentProfile?.id
                        ) || []
                      }
                    />
                  </View>
                </View>
              )}

              {messages?.map((message, idx) => (
                <View key={message.id} className="px-2">
                  <MessageInThread
                    previous={messages[idx - 1]}
                    message={message}
                    multipleParticipants={isGroupChat}
                    conversationRootId={id}
                  />
                </View>
              ))}
            </ScrollView>

            <View>
              {attachments.length > 0 && (
                <ComposeAttachments
                  attachments={attachments}
                  removeAttachment={(index) => {
                    setAttachments(attachments.filter((_, i) => i !== index));
                  }}
                  updateAttachment={(index, attachment) => {
                    setAttachments(
                      attachments.map((a, i) => (i === index ? attachment : a))
                    );
                  }}
                />
              )}
              <View className="px-4 py-3 bg-background border-t border-border">
                <OpenpeepsMarkdownInput
                  rows={3}
                  value={content}
                  onChange={setContent}
                  maxLength={maxContentLength}
                  placeholder={t('conversations.placeholder', {
                    defaultValue: 'Write a message…',
                  })}
                />
                <View className="flex-row justify-end">
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={
                      isSending ||
                      !content.trim() ||
                      content.length > maxContentLength
                    }
                    className={`p-2 rounded-full ${
                      content.trim() && content.length <= maxContentLength
                        ? 'bg-primary'
                        : 'bg-surface'
                    }`}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <SendHorizonalIcon />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </DropdownMenu>
        {isGroupChat && participantsOpen ? (
          <ConversationParticipantsModal
            open
            onOpenChange={setParticipantsOpen}
            participants={audience}
          />
        ) : null}
      </View>
    </ThemedSafeAreaView>
  );
};
