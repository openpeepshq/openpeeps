import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useParticipants } from '@livekit/react-native';
import { useTranslation } from 'react-i18next';
import { useJamChat } from '@openpeepshq/react';
import type { JamEvent } from '@openpeepshq/common';
import { SendHorizontalIcon } from '../icons/index';
import { Textarea } from '../ui/textarea';
import { ThemedText } from '../ui/themed-text';
import { JamChatMessage } from './JamChatMessage';
import { JamDrawer } from './JamDrawer';

export interface JamChatDrawerProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export const JamChatDrawer = ({
  open,
  onClose,
  readOnly = false,
}: JamChatDrawerProps) => {
  const { t } = useTranslation();
  const participants = useParticipants();
  const insets = useSafeAreaInsets();
  // JamDrawer title bar height: size-10 (40px) + p-2 vertical padding (16px) = 56px.
  // Combined with useSafeAreaInsets().top, this makes the KAV offset dynamic
  // across device classes, orientations, and safe-area changes.
  const TITLE_BAR_HEIGHT = 56;
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
  } = useJamChat({ participants, readOnly });
  const listRef = useRef<FlatList<JamEvent>>(null);

  // iOS: offset = safe-area top inset + title bar height — adapts across
  // devices, orientations, and split-screen.
  // Android: KAV disabled (enabled={false}) so it does not double-shrink the
  // list against the host app's adjustResize windowSoftInputMode.
  const keyboardVerticalOffset =
    Platform.OS === 'ios' ? insets.top + TITLE_BAR_HEIGHT : 0;

  useEffect(() => {
    if (!open || messages.length === 0) return;
    const timeout = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      300
    );
    return () => clearTimeout(timeout);
  }, [open, messages.length]);

  const handleSendMessage = async () => {
    if (!(await send())) return;
    listRef.current?.scrollToEnd({ animated: true });
  };

  if (!open) {
    return null;
  }

  return (
    <JamDrawer title={t('jams.drawer.chatTitle')} onClose={onClose}>
      {/* iOS: shrink above the soft keyboard; Android: no-op (host app adjustResize). */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled={Platform.OS === 'ios'}
      >
        {/* flex-1 is load-bearing here — without it FlatList sizes to content
            and does not fill the remaining KAV space. */}
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
            <JamChatMessage message={item} mentionProfiles={mentionProfiles} />
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
    </JamDrawer>
  );
};
