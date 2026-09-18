import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { ThemedView } from '~/components/ui/themed-view';
import { MainScreenProps } from '~/components/navigation/types';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { TouchableOpacity } from 'react-native';
import { GenericHeader } from '~/components/custom/headers';
import { SendHorizonalIcon } from '~/components/icons';
import { useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { Profile, PublicProfile } from '@openpeepshq/common';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { OpenpeepsMarkdownInput } from '~/components/custom/post/post-form/OpenpeepsMarkdownInput';
import { useTranslation } from 'react-i18next';
import { maxContentLength } from '~/lib/utils';

type DraftMessageProps = MainScreenProps<'DraftMessage'>;

export const DraftMessage = ({ navigation }: DraftMessageProps) => {
  const { t } = useTranslation();
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { members, clearMembers, contnt, setContt } = useNewConversationStore();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const sendMessage = openpeepsApi.createPostAction();

  const toPublicProfile = (profile: Profile): PublicProfile => ({
    ...profile,
    memberships: [],
  });

  const handleSendMessage = async () => {
    if (
      !content.trim() ||
      !currentProfile ||
      content.length > maxContentLength
    ) {
      return;
    }
    try {
      setIsSending(true);
      sendMessage({
        visibility: 'direct',
        audience: [...members, currentProfile].map(toPublicProfile),
        data: {
          type: 'note',
          content: content,
        },
        type: 'note',
      })
        .then((data) => {
          setContent('');
          setContt('');
          clearMembers();
          navigation.pop();
          navigation.pop();
          navigation.navigate('Conversation', { id: data.id });
        })
        .catch((error) => {
          console.error('Failed to send message:', error);
        })
        .finally(() => setIsSending(false));
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (contnt) {
      setContent(contnt);
    }
  }, [contnt]);

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader title={'Draft Message'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={scrollViewRef}
          className="p-2 w-full flex-1"
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          <View className="p-4">
            <ThemedText>
              New message to :{' '}
              {[...members, currentProfile as Profile]
                .map((member) => member.displayName || `@${member.handle}`)
                .join(', ')}
            </ThemedText>
          </View>
        </ScrollView>

        <ThemedView className="p-2 border-t border-border bg-background">
          <OpenpeepsMarkdownInput
            rows={5}
            value={content}
            onChange={setContent}
            maxLength={maxContentLength}
            placeholder={t('conversations.createNew.messagePlaceholder', {
              defaultValue: 'Write a message…',
            })}
          />
          <View className="flex-row justify-end">
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={
                !content.trim() ||
                isSending ||
                content.length > maxContentLength
              }
              className={`p-2 rounded-full ${
                content.trim() && content.length <= maxContentLength
                  ? 'bg-primary'
                  : 'bg-surface'
              }`}
            >
              {isSending ? (
                <ActivityIndicator size={'small'} />
              ) : (
                <SendHorizonalIcon />
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedSafeAreaView>
  );
};
