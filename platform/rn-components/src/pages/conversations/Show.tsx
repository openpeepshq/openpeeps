import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MainScreenProps } from '../../components/navigation/types/index';
import {
  adjustUnseenCounts,
  useOpenpeeps,
  usePostViewFlush,
} from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { useSetPageHeader } from '../../components/layout';
import { ThemedView } from '../../components/ui/themed-view';
import {
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { InfoIcon } from '../../components/icons/index';
import { MediaAttachmentData } from '@openpeepshq/common';
import { ComposeAttachments } from '../../components/post/post-form/ComposeAttachments';
import { OpenpeepsMarkdownInput } from '../../components/post/post-form/OpenpeepsMarkdownInput';
import { maxContentLength } from '../../lib/utils';
import { DropdownMenu } from '../../components/ui/dropdown-menu';
import { Button } from '../../components/ui/button';
import { ThemedText } from '../../components/ui/themed-text';
import {
  ConversationParticipantsModal,
  ConversationProfileHeader,
  MessageInThread,
} from '../../components/conversations/index';

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

  useSetPageHeader(
    isLoading ? undefined : (
      <ConversationProfileHeader
        participants={headerParticipants}
        onPress={isGroupChat ? () => setParticipantsOpen(true) : undefined}
      />
    ),
    isLoading ? undefined : (
      <TouchableOpacity
        onPress={() => navigation.navigate('ConversationInfo', { id })}
      >
        <InfoIcon size={18} className="text-foreground" />
      </TouchableOpacity>
    )
  );

  if (isLoading) {
    return (
      <ThemedView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <View className="flex-1">
        <DropdownMenu>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 pb-8"
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
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
                  <Button
                    variant="default"
                    onPress={handleSendMessage}
                    disabled={
                      isSending ||
                      !content.trim() ||
                      content.length > maxContentLength
                    }
                  >
                    {isSending ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator size="small" />
                        <ThemedText className="ml-2">
                          {t('common.sending', { defaultValue: 'Sending…' })}
                        </ThemedText>
                      </View>
                    ) : (
                      <ThemedText>
                        {t('common.send', { defaultValue: 'Send' })}
                      </ThemedText>
                    )}
                  </Button>
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
    </ThemedView>
  );
};
