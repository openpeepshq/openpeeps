import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
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
  const isIos = Platform.OS === 'ios';
  // The offset is the screen-Y of the KAV's parent (the drawer root): the
  // screen's safe-area view pads it by insets.top. The title bar and the
  // gap-3 are siblings above the KAV in that parent — part of the KAV's own
  // frame — so do not add them to the offset. The body only renders where a
  // provider has settled non-null insets (the wrapper's decision), so the
  // read below is plain.
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
  } = useJamChat({ participants, readOnly });
  const listRef = useRef<FlatList<JamEvent>>(null);

  useEffect(() => {
    if (!open || messages.length === 0) return;
    const timeout = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      300
    );
    return () => clearTimeout(timeout);
  }, [open, messages.length]);

  // Re-pin the newest message on keyboardDidShow (the base-sheet.tsx
  // pattern); iOS-only — Android keyboard avoidance is the host's
  // adjustResize, so no JS re-pin there.
  useEffect(() => {
    if (!open || readOnly || !isIos) return;
    const sub = Keyboard.addListener('keyboardDidShow', () =>
      listRef.current?.scrollToEnd({ animated: true })
    );
    return () => sub.remove();
  }, [open, readOnly, isIos]);

  const handleSendMessage = async () => {
    if (!(await send())) return;
    listRef.current?.scrollToEnd({ animated: true });
  };

  if (!open) {
    return null;
  }

  return (
    <JamDrawer title={t('jams.drawer.chatTitle')} onClose={onClose}>
      {/* KeyboardAvoidingView is a no-op on Android — keyboard avoidance
          there relies on the host app's windowSoftInputMode. The example
          app ships adjustResize; the shipping host is confirmed separately
          (replan §6). Keeping the KAV disabled on Android avoids a
          double-shrink flash next to the OS resize. */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={isIos ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled={isIos}
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
