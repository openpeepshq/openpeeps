import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import {
  conversationLabel,
  messagePreviewText,
  profileName,
  type DirectMessageSearchHit,
} from '@openpeepshq/common';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { UpdatingDate } from '../custom/date/updating-date';
import { Input } from '../ui/input';
import { ThemedText } from '../ui/themed-text';

export const DirectMessageSearch = ({
  conversationId,
  autoFocus,
  onQueryChange,
  onSelect,
}: {
  conversationId?: string;
  autoFocus?: boolean;
  onQueryChange?: (query: string) => void;
  onSelect: (hit: DirectMessageSearchHit) => void;
}) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  const search = openpeepsApi.useSearchDirectMessages(query, conversationId);
  const active = query.length >= 2;
  const hits = search.data ?? [];
  const placeholder = conversationId
    ? t('conversations.search.inConversation', {
        defaultValue: 'Search this conversation…',
      })
    : t('conversations.search.placeholder', {
        defaultValue: 'Search all messages…',
      });

  return (
    <View className="border-border gap-2 border-b p-3">
      <Input
        value={input}
        onChangeText={setInput}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        testID="dm-search-input"
      />
      {active && search.isFetching ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" />
          <ThemedText className="text-muted-foreground text-sm">
            {t('conversations.search.searching', {
              defaultValue: 'Searching…',
            })}
          </ThemedText>
        </View>
      ) : null}
      {active && search.isError ? (
        <ThemedText className="text-destructive text-sm">
          {t('conversations.search.error', { defaultValue: 'Search failed' })}
        </ThemedText>
      ) : null}
      {active && !search.isFetching && !search.isError && hits.length === 0 ? (
        <ThemedText className="text-muted-foreground text-sm">
          {t('conversations.search.empty', {
            defaultValue: 'No messages match "{{query}}"',
            query,
          })}
        </ThemedText>
      ) : null}
      {active && hits.length > 0 ? (
        <ScrollView
          style={{ maxHeight: 240 }}
          accessibilityLabel={t('conversations.search.results', {
            defaultValue: 'Message search results',
          })}
          testID="dm-search-results"
        >
          {hits.map((hit) => {
            const senderId = hit.message.profile.id;
            const sender =
              senderId === me?.id
                ? t('common.you', { defaultValue: 'You' })
                : profileName(hit.message.profile);
            const others = conversationLabel(hit.message, me?.id);
            return (
              <Pressable
                key={hit.message.id}
                className="rounded-md px-2 py-2"
                accessibilityLabel={t('conversations.search.openResult', {
                  defaultValue: 'Show this message',
                })}
                testID="dm-search-result"
                onPress={() => onSelect(hit)}
              >
                {!conversationId && others ? (
                  <ThemedText
                    className="text-sm font-semibold"
                    numberOfLines={1}
                  >
                    {others}
                  </ThemedText>
                ) : null}
                <ThemedText
                  className="text-muted-foreground text-sm"
                  numberOfLines={1}
                >
                  {sender}
                </ThemedText>
                <UpdatingDate date={hit.message.createdAt} />
                <ThemedText className="text-sm" numberOfLines={2}>
                  {messagePreviewText(hit.message)}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
};
