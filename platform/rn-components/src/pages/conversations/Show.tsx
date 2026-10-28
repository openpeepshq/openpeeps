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
import { ProfileCard } from '../../components/profile/ProfileCard';

/**
 * Shows handle + bio for a 1:1 conversation participant, without a
 * duplicate avatar (the header already renders it).
 */
const ConversationParticipantDetail = ({
  profile,
}: {
  profile: import('@openpeepshq/common').Profile;
}) => {
  const truncate = (text: string | null | undefined, max: number) =>
    !text ? '' : text.length > max ? text.slice(0, max) + '…' : text;
  return (
    <View className="gap-y-1 p-3">
      <ThemedText className="text-muted-foreground text-xs">
        @{profile.handle}
      </ThemedText>
      {profile.bio ? (
        <ThemedText className="text-sm">
          {truncate(profile.bio, 100)}
        </ThemedText>
      ) : null}
    </View>
  );
};

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

  // Mirror the web Show page: derive participants from the last message's
  // audience, excluding the current profile.
  const lastMessage = messages?.slice(-1)[0];
  const participants =
    lastMessage?.audience?.filter((a) => a.id !== currentProfile?.id) ?? [];
  const multipleParticipants = participants.length > 1;

  const participantNames =
    participants.length > 0
      ? participants.map((p) => p.displayName || `@${p.handle}`).join(', ')
      : t('conversations.title', { defaultValue: 'Conversation' });

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

  // The URL may point at any root of a merged 1:1 conversation (e.g.
  // notification links); unseen counts are merged under the pair's oldest
  // root, so clear that key once the conversation's first message is known.
  const firstMessageId = messages?.[0]?.id;
  useEffect(() => {
    if (!id || !firstMessageId || firstMessageId === id) return;
    adjustUnseenCounts(queryClient, client, {
      clearConversation: firstMessageId,
    });
  }, [id, firstMessageId, client, queryClient]);

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
        participants={participants}
        onPress={
          multipleParticipants ? () => setParticipantsOpen(true) : undefined
        }
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
        {/* Section under the page header showing the participants,
            mirroring the web conversation Show page. */}
        <View className="border-b border-border">
          {participants.length === 1 && participants[0] ? (
            <ConversationParticipantDetail profile={participants[0]} />
          ) : multipleParticipants ? (
            <TouchableOpacity
              onPress={() => setParticipantsOpen(true)}
              className="w-full flex-row items-center gap-2 p-3"
            >
              <View className="flex-row -space-x-2 shrink-0">
                {participants.slice(0, 4).map((p) => (
                  <ProfileAvatar
                    key={p.id}
                    profile={p}
                    className="size-9 border-0"
                  />
                ))}
              </View>
              <ThemedText
                className="min-w-0 truncate text-sm font-medium"
                numberOfLines={1}
              >
                {participantNames}
              </ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>

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
                    multipleParticipants={multipleParticipants}
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
        {multipleParticipants && participantsOpen ? (
          <ConversationParticipantsModal
            open
            onOpenChange={setParticipantsOpen}
            participants={participants}
          />
        ) : null}
      </View>
    </ThemedView>
  );
};
