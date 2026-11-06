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
import { useCreateConversation, useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '../../components/ui/themed-text';
import { MediaAttachment, Profile, PublicProfile } from '@openpeepshq/common';
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
  const attachmentsPending = attachments.some(isAttachmentProcessing);
  const canSend =
    !submitting &&
    !attachmentsPending &&
    message.length <= maxContentLength &&
    (message.trim().length > 0 || attachments.length > 0);

  const openImagePicker = useCallback(async () => {
    const hasPermission = await checkMediaPermissions(t, 'photo');
    if (hasPermission) imagePickerRef.current?.present();
  }, [t]);

  const addAttachments = useCallback(
    (images: MediaAttachment[]) => {
      setAttachments((current) => [...current, ...images]);
    },
    [setAttachments]
  );

  useEffect(() => {
    if (contnt) setMessage(contnt);
  }, [contnt, setMessage]);

  useSetPageHeader(t('conversations.draft.title'));

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
              removeAttachment={(index) => {
                setAttachments(attachments.filter((_, i) => i !== index));
              }}
              updateAttachment={(index, attachment) => {
                setAttachments(
                  attachments.map((item, i) =>
                    i === index ? attachment : item
                  )
                );
              }}
            />
          ) : null}
          <OpenpeepsMarkdownInput
            rows={5}
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
              disabled={submitting}
              testID="conversation-add-image"
            >
              <ImageIcon size={20} className="text-foreground" />
            </Button>
            <TouchableOpacity
              onPress={() => void send()}
              disabled={!canSend}
              className={`p-2 rounded-full ${
                canSend ? 'bg-primary' : 'bg-surface'
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
