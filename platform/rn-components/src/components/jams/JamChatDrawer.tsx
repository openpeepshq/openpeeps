import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  View,
} from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { useParticipants } from '@livekit/react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useJamChat } from '@openpeepshq/react';
import type { JamEvent } from '@openpeepshq/common';
import { SendHorizontalIcon } from '../icons/index';
import { Textarea } from '../ui/textarea';
import { ThemedText } from '../ui/themed-text';
import { JamChatMessage } from './JamChatMessage';
import { JamDrawer } from './JamDrawer';
import { DeleteMessageSheet } from './DeleteMessageSheet';

export interface JamChatDrawerProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

/**
 * The drawer reads the insets context directly (null without a provider
 * instead of throwing) and, when the host has no root SafeAreaProvider,
 * mounts a local one so the offset below — and any descendant
 * useSafeAreaInsets() call — resolve. A real provider higher in the tree
 * stays authoritative because it keeps the context set.
 */
export const JamChatDrawer = ({
  open,
  onClose,
  readOnly = false,
}: JamChatDrawerProps) => {
  const insets = React.useContext(SafeAreaInsetsContext);
  const body = (
    <JamChatDrawerBody open={open} onClose={onClose} readOnly={readOnly} />
  );
  if (insets != null) return body;
  return <SafeAreaProvider>{body}</SafeAreaProvider>;
};

const JamChatDrawerBody = ({
  open,
  onClose,
  readOnly = false,
}: JamChatDrawerProps) => {
  const { t } = useTranslation();
  const participants = useParticipants();
  // The offset is the screen-Y of the KAV's parent — the JamDrawer root,
  // inside the shell's content area, which the screen's safe-area view pads
  // by insets.top (on both platforms). The KAV measures the keyboard in
  // screen space but its own frame is parent-relative. The title bar and
  // gap-3 are siblings above the KAV in that parent, so they sit inside it
  // and do not shift its screen-Y — correctly excluded from the offset.
  // The body only renders where a provider has settled non-null insets, so
  // the read below is plain.
  const keyboardVerticalOffset = React.useContext(SafeAreaInsetsContext)!.top;
  const {
    messages,
    mentionProfiles,
    isLoading,
    isFetchingNextPage,
    loadOlder,
    newMessage,
    setNewMessage,
    isSending,
    send,
    canDeleteMessage,
    removeMessage,
  } = useJamChat({ participants, readOnly });
  const listRef = useRef<FlatList<JamEvent>>(null);
  const deleteMessageSheetRef = useRef<BottomSheetModal>(null);
  const [deletableMessageId, setDeletableMessageId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!open || messages.length === 0) return;
    const timeout = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      300
    );
    return () => clearTimeout(timeout);
  }, [open, messages.length]);

  // Re-pin the newest message when the keyboard shows (the base-sheet.tsx
  // pattern). Cross-platform: the KAV's 'padding' reflow lands after the
  // keyboard animation, so the re-pin then settles the newest message above
  // the composer. Skipped when readOnly (no composer to re-pin against).
  useEffect(() => {
    if (!open || readOnly) return;
    const sub = Keyboard.addListener('keyboardDidShow', () =>
      listRef.current?.scrollToEnd({ animated: true })
    );
    return () => sub.remove();
  }, [open, readOnly]);

  const handleSendMessage = async () => {
    if (!(await send())) return;
    listRef.current?.scrollToEnd({ animated: true });
  };

  const handleLongPressMessage = (message: JamEvent) => {
    if (canDeleteMessage(message)) {
      setDeletableMessageId(message.id);
      deleteMessageSheetRef.current?.present();
    }
  };

  const handleDeleteMessage = async () => {
    if (!deletableMessageId) return;
    try {
      await removeMessage(deletableMessageId);
      Toast.show({ type: 'success', text1: t('jams.chat.deleted') });
    } catch {
      Toast.show({ type: 'error', text1: t('jams.chat.deleteError') });
    } finally {
      setDeletableMessageId(null);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <JamDrawer title={t('jams.drawer.chatTitle')} onClose={onClose}>
      {/* Keyboard avoidance is the component's own job on both platforms so
          it does not depend on the host app's windowSoftInputMode — the
          shipping host does not resize, and leaving the KAV disabled there
          left the keyboard covering the chat (the QA retest on the shipping
          build found the keyboard still covers the chat).
          'padding' is the validated iOS mechanism; it is host-independent
          and self-correcting (the KAV measures the real overlap, so it adds
          ~0 when a host already resizes — no double-shrink). */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {/* flex-1 is load-bearing here — without it FlatList sizes to
            content and does not fill the remaining KAV space. */}
        <FlatList
          ref={listRef}
          className="flex-1"
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerClassName="gap-4 px-2 pb-4"
          // Older messages load when the user scrolls to the top (web: sentinel).
          onStartReached={loadOlder}
          onStartReachedThreshold={0.1}
          ListHeaderComponent={
            isFetchingNextPage ? (
              <View className="items-center py-2">
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText className="mt-4 text-center text-muted-foreground">
                {t('jams.chat.noMessages')}
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <JamChatMessage
              message={item}
              mentionProfiles={mentionProfiles}
              onDelete={
                canDeleteMessage(item)
                  ? () => handleLongPressMessage(item)
                  : undefined
              }
            />
          )}
        />

        {!readOnly ? (
          <View className="w-full flex-row items-center gap-x-2 bg-background p-2">
            <Textarea
              editable={!isSending}
              value={newMessage}
              numberOfLines={1}
              onChangeText={setNewMessage}
              onSubmitEditing={() => void handleSendMessage()}
              blurOnSubmit
              className="min-h-0 flex-1 border-0"
              placeholder={t('jams.chat.messagePlaceholder')}
            />
            <Pressable
              accessibilityLabel={t('jams.chat.sendTitle')}
              disabled={isSending}
              onPress={() => void handleSendMessage()}
            >
              {isSending ? (
                <ActivityIndicator size="small" />
              ) : (
                <SendHorizontalIcon size={24} className="text-foreground" />
              )}
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
      <DeleteMessageSheet
        ref={deleteMessageSheetRef}
        onDelete={handleDeleteMessage}
      />
    </JamDrawer>
  );
};
