import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect } from 'react';
import { ThemedView } from '~/components/ui/themed-view';
import { MainScreenProps } from '~/components/navigation/types';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { TouchableOpacity } from 'react-native';
import { GenericHeader } from '~/components/custom/headers';
import { SendHorizonalIcon } from '~/components/icons';
import { useCreateConversation, useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { Profile, PublicProfile } from '@openpeepshq/common';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { OpenpeepsMarkdownInput } from '~/components/post/post-form/OpenpeepsMarkdownInput';
import { useTranslation } from 'react-i18next';
import { maxContentLength } from '~/lib/utils';

type DraftMessageProps = MainScreenProps<'DraftMessage'>;

export const DraftMessage = ({ navigation }: DraftMessageProps) => {
  const { t } = useTranslation();
  const { members, clearMembers, contnt, setContt } = useNewConversationStore();
  const { currentProfile } = useOpenpeeps();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const { message, setMessage, send, submitting } = useCreateConversation({
    profiles: members as PublicProfile[],
    message: contnt,
    skipProfileSelection: true,
    onClose: () => {
      setContt('');
      clearMembers();
      navigation.pop();
      navigation.pop();
    },
  });

  useEffect(() => {
    if (contnt) setMessage(contnt);
  }, [contnt, setMessage]);

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader title={t('conversations.draft.title')} />
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          ref={scrollViewRef}
          className="p-2 w-full flex-1"
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          <View className="p-4">
            <ThemedText>
              {t('conversations.draft.recipients', {
                names: [...members, currentProfile as Profile]
                  .map((member) => member.displayName || `@${member.handle}`)
                  .join(', '),
              })}
            </ThemedText>
          </View>
        </ScrollView>

        <ThemedView className="p-2 border-t border-border bg-background">
          <OpenpeepsMarkdownInput
            rows={5}
            value={message}
            onChange={setMessage}
            maxLength={maxContentLength}
            placeholder={t('conversations.createNew.messagePlaceholder', {
              defaultValue: 'Write a message…',
            })}
          />
          <View className="flex-row justify-end">
            <TouchableOpacity
              onPress={() => void send()}
              disabled={
                !message.trim() ||
                submitting ||
                message.length > maxContentLength
              }
              className={`p-2 rounded-full ${
                message.trim() && message.length <= maxContentLength
                  ? 'bg-primary'
                  : 'bg-surface'
              }`}
            >
              {submitting ? (
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
