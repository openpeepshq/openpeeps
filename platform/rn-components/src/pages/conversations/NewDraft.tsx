import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedView } from '../../components/ui/themed-view';
import { MainScreenProps } from '../../components/navigation/types/index';
import { useNewConversationStore } from '../../stores/useNewConversationStore';
import { TouchableOpacity } from 'react-native';
import { useSetPageHeader } from '../../components/layout';
import { ImageIcon, SendHorizonalIcon } from '../../components/icons/index';
import {
  canSendDmMessage,
  useCreateConversation,
  useOpenpeeps,
  DM_MAX_ATTACHMENTS,
} from '@openpeepshq/react';
import { ThemedText } from '../../components/ui/themed-text';
import {
  MediaAttachment,
  Profile,
  PublicProfile,
  visibleTextLength,
} from '@openpeepshq/common';
import { ImagePickerSheet } from '../../components/custom/index';
import { ComposeAttachments } from '../../components/post/post-form/ComposeAttachments';
import { OpenpeepsMarkdownInput } from '../../components/post/post-form/OpenpeepsMarkdownInput';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { maxContentLength } from '../../lib/utils';
import { checkMediaPermissions } from '../../lib/media-permissions';
import { isAttachmentProcessing } from '../../lib/post';

type DraftMessageProps = MainScreenProps<'DraftMessage'>;

export const DraftMessage = ({ navigation }: DraftMessageProps) => {
  const { t } = useTranslation();
  const { members, clearMembers, contnt, setContt } = useNewConversationStore();
  const { currentProfile } = useOpenpeeps();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const { message, setMessage, attachments, setAttachments, send, submitting } =
    useCreateConversation({
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
  const imagePickerRef = useRef<BottomSheetModal>(null);
  const canSend = canSendDmMessage({
    sending: submitting,
    uploadsPending: attachments.some(isAttachmentProcessing),
    text: message,
    attachments,
  });

  const openImagePicker = useCallback(async () => {
    const hasPermission = await checkMediaPermissions(t, 'photo');
    if (hasPermission) imagePickerRef.current?.present();
  }, [t]);

  const addAttachments = useCallback(
    (images: MediaAttachment[]) => {
      setAttachments((current) =>
        [...current, ...images].slice(0, DM_MAX_ATTACHMENTS)
      );
    },
    [setAttachments]
  );

  useEffect(() => {
    if (contnt) setMessage(contnt);
  }, [contnt, setMessage]);

  useSetPageHeader(t('conversations.draft.title'));

  const visibleMessageLen = visibleTextLength(message);

  return (
    <ThemedView className="flex-1 relative">
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
          {attachments.length > 0 ? (
            <ComposeAttachments
              attachments={attachments}
              removeAttachment={(index) =>
                setAttachments((current) =>
                  current.filter((_, i) => i !== index)
                )
              }
              updateAttachment={(index, attachment) =>
                setAttachments((current) =>
                  current.map((item, i) => (i === index ? attachment : item))
                )
              }
            />
          ) : null}
          <OpenpeepsMarkdownInput
            rows={5}
            blockOverflow={false}
            value={message}
            onChange={setMessage}
            maxLength={maxContentLength}
            placeholder={t('conversations.createNew.messagePlaceholder', {
              defaultValue: 'Write a message…',
            })}
          />
          <View className="flex-row items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              accessibilityLabel={t('posts.form.addImage')}
              onPress={() => void openImagePicker()}
              disabled={submitting || attachments.length >= DM_MAX_ATTACHMENTS}
              testID="conversation-add-image"
            >
              <ImageIcon size={20} className="text-foreground" />
            </Button>
            <TouchableOpacity
              onPress={() => void send()}
              disabled={!canSend || !message.trim() || visibleMessageLen > maxContentLength}
              className={`p-2 rounded-full ${
                canSend && message.trim() && visibleMessageLen <= maxContentLength
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
      <ImagePickerSheet
        ref={imagePickerRef}
        usage="post-image"
        onSelect={addAttachments}
      />
    </ThemedView>
  );
};
