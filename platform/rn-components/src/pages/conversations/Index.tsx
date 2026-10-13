import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircleOffIcon } from '../../components/icons/index';
import { ThemedText } from '../../components/ui/themed-text';
import {
  useSetPageHeader,
  useSetPlusButtonActions,
} from '../../components/layout';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuthData, useOpenpeeps } from '@openpeepshq/react';
import { SearchIcon, XIcon } from '../../components/icons/index';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '../../components/navigation/types/index';
import { canCreatePost, PublicPost } from '@openpeepshq/common';
import { Input } from '../../components/ui/input';
import { profileMatchesQuery } from '../../lib/utils';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  ConversationPreviewCard,
  DirectMessagesHeaderActions,
  useCreateNewConversation,
} from '../../components/conversations/index';
import { useTranslation } from 'react-i18next';
import { ConversationSettingsSheet } from '../../components/conversations/index';

type MessagesProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Messages'>,
  NativeStackScreenProps<MainStackParamList>
>;

type ConversationsTab = 'active' | 'archived';

export const ConversationsIndex: React.FC<MessagesProps> = ({ navigation }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const authData = useAuthData();
  const canCreate = canCreatePost(authData, 'note', 'direct');
  const { openCreateConversation } = useCreateNewConversation();
  const settingsRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredConversations, setFilteredConversations] = useState<
    PublicPost[][]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchToggled, setIsSearchToggled] = useState(false);
  const [tab, setTab] = useState<ConversationsTab>('active');

  const query = openpeepsApi.useConversations();
  const archivedQuery = openpeepsApi.useArchivedConversations();
  const unseenCountsQuery = openpeepsApi.useUnseenPostCounts();
  const unseenByConversation = unseenCountsQuery.data?.direct ?? {};

  const activeQuery = tab === 'active' ? query : archivedQuery;
  const conversations = useMemo(
    () => activeQuery.data ?? [],
    [activeQuery.data]
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await activeQuery.refetch();
    setRefreshing(false);
  }, [activeQuery]);

  useEffect(() => {
    const filtered = conversations.filter((conversation) =>
      conversation.some(
        (message) =>
          message?.data?.content
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          profileMatchesQuery(message.profile, searchQuery)
      )
    );
    setFilteredConversations(filtered);
  }, [conversations, searchQuery]);

  useSetPageHeader(
    t('navigation.messages'),
    <View className="flex-row items-center gap-x-3">
      {isSearchToggled ? (
        <View className="max-w-[180px] flex-row items-center">
          <Input
            className="flex-1"
            placeholder={t('conversations.search.placeholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            className="items-center justify-center px-2"
            onPress={() => {
              setSearchQuery('');
              setIsSearchToggled(false);
            }}
          >
            <XIcon size={20} className="text-foreground" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setIsSearchToggled(true)}>
          <SearchIcon size={20} className="text-foreground" />
        </TouchableOpacity>
      )}
      <DirectMessagesHeaderActions />
    </View>
  );

  const headerTabs = (
    <View className="flex-row border-b border-border">
      <TouchableOpacity
        onPress={() => setTab('active')}
        className={`px-4 py-2 text-sm ${
          tab === 'active'
            ? 'border-primary border-b-2 font-semibold'
            : 'text-muted-foreground'
        }`}
      >
        <ThemedText
          className={
            tab === 'active' ? 'font-semibold' : 'text-muted-foreground'
          }
        >
          {t('conversations.tabs.active', { defaultValue: 'Active' })}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setTab('archived')}
        className={`px-4 py-2 text-sm ${
          tab === 'archived'
            ? 'border-primary border-b-2 font-semibold'
            : 'text-muted-foreground'
        }`}
      >
        <ThemedText
          className={
            tab === 'archived' ? 'font-semibold' : 'text-muted-foreground'
          }
        >
          {t('conversations.tabs.archived', { defaultValue: 'Archived' })}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  useSetPlusButtonActions(
    canCreate
      ? {
          title: t('conversations.newMessage'),
          action: () => openCreateConversation(),
        }
      : undefined
  );

  const isLoading = activeQuery.isLoading;

  return (
    <View className="flex-1">
      {headerTabs}
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerClassName="grow"
        className="w-full flex bg-background relative p-2"
      >
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && filteredConversations?.length === 0 && (
          <View className="flex h-[80vh] items-center justify-center gap-2">
            <MessageCircleOffIcon size={40} className="text-muted-foreground" />
            <ThemedText className="text-muted-foreground">
              {t('conversations.empty', {
                defaultValue: 'No direct messages here',
              })}
            </ThemedText>
          </View>
        )}
        {!isLoading &&
          filteredConversations?.map((conversation, idx) => (
            <ConversationPreviewCard
              key={idx}
              conversation={conversation}
              unreadCount={
                conversation[0]?.id
                  ? (unseenByConversation[conversation[0].id] ?? 0)
                  : 0
              }
              onPress={() =>
                navigation.navigate('Conversation', {
                  id: conversation[0]?.id,
                })
              }
            />
          ))}
      </KeyboardAwareScrollView>
      <ConversationSettingsSheet
        ref={settingsRef}
        onMessageRequestChange={(value) => {
          console.log('Message requests:', value);
        }}
        onReadReceiptsChange={(value) => {
          console.log('Read receipts:', value);
        }}
      />
    </View>
  );
};
