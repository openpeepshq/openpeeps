import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { PublicPost } from '@openpeepshq/common/types';
import { truncateText } from '@openpeepshq/common/lib';
import {
  conversationTitle,
  useCurrentProfile,
  useOpenpeeps,
} from '@openpeepshq/react';
import { useControlledSheet } from '../../../../hooks/use-controlled-sheet';
import { BaseSheet } from '../../../custom/modals/common';
import { ThemedText } from '../../../ui/themed-text';
import { LoadingSpinner } from '../../../ui/loading-spinner';
import { Button } from '../../../ui/button';

export interface SendToConversationModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen conversation; the caller posts the message. */
  onSend: (conversation: PublicPost[]) => Promise<void>;
}

export const SendToConversationModal = ({
  open,
  onClose,
  onSend,
}: SendToConversationModalProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const conversationsQuery = openpeepsApi.useConversations();
  const ref = useControlledSheet(open);
  const [sending, setSending] = useState<string | null>(null);

  const conversations = useMemo(
    () => (conversationsQuery.data ?? []).filter((c) => c.length > 0),
    [conversationsQuery.data]
  );

  // The last post's audience is the current view; a leaver (or a
  // note-to-self follow-up) can leave it with no other members, so fall back
  // to the root post's participants before labeling it "You" (shared helper).
  const conversationTitleFor = (conversation: PublicPost[]) =>
    conversationTitle(conversation, t, me?.id, { fallbackToRoot: true });

  const send = async (conversation: PublicPost[]) => {
    const root = conversation[0];
    if (!root || sending) return;
    setSending(root.id);
    try {
      await onSend(conversation);
      Toast.show({
        type: 'success',
        text1: t('posts.shareMenu.sentToConversation', {
          defaultValue: 'Sent to {{name}}',
          name: truncateText(conversationTitleFor(conversation), 30),
        }),
      });
      onClose();
    } catch {
      Toast.show({
        type: 'error',
        text1: t('posts.shareMenu.shareFailed', {
          defaultValue: "Couldn't share the post",
        }),
      });
    } finally {
      setSending(null);
    }
  };

  return (
    <BaseSheet
      ref={ref}
      snapPoints={['85%']}
      scrollable
      onDismiss={() => {
        if (!sending) onClose();
      }}
    >
      <View className="p-6 pb-2">
        <ThemedText className="text-lg font-semibold">
          {t('posts.shareMenu.sendToConversationPickerTitle', {
            defaultValue: 'Send to conversation',
          })}
        </ThemedText>
      </View>
      {conversationsQuery.isLoading ? (
        <View className="p-8">
          <LoadingSpinner />
        </View>
      ) : conversations.length === 0 ? (
        <ThemedText className="p-5 text-center text-sm text-muted-foreground">
          {t('posts.shareMenu.noConversations', {
            defaultValue: "You don't have any conversations yet",
          })}
        </ThemedText>
      ) : (
        conversations.map((conversation) => {
          const root = conversation[0];
          const last = conversation[conversation.length - 1];
          if (!root || !last) return null;
          const isMine =
            last.data?.type === 'note' && last.profile?.id === me?.id;
          return (
            <Button
              key={root.id}
              variant="ghost"
              className="min-h-[70px] flex-row items-center justify-between px-4 py-3"
              disabled={sending !== null}
              onPress={() => send(conversation)}
            >
              <View className="flex-1 flex-row items-center">
                {sending === root.id ? (
                  <LoadingSpinner className="mr-2" />
                ) : null}
                <View className="flex-1">
                  <ThemedText className="text-foreground">
                    {truncateText(conversationTitleFor(conversation), 40)}
                  </ThemedText>
                  {last.data?.type === 'note' ? (
                    <ThemedText className="text-sm text-muted-foreground">
                      {isMine
                        ? t('common.you', { defaultValue: 'You' })
                        : `@${last.profile?.handle ?? ''}`}
                      {': '}
                      {truncateText(last.data.content, 40)}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </Button>
          );
        })
      )}
    </BaseSheet>
  );
};
