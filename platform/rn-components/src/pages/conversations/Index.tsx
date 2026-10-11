import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useRef } from 'react';
import { EmptyStateContainer } from '../../components/custom/index';
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

export const ConversationsIndex: React.FC<MessagesProps> = ({ navigation }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const authData = useAuthData();
  const canCreate = canCreatePost(authData, 'note', 'direct');
  const { openCreateConversation } = useCreateNewConversation();
  const settingsRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filteredConversations, setFilteredConversations] = React.useState<
    PublicPost[][]
  >([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchToggled, setIsSearchToggled] = React.useState(false);

  const {
    data: conversations,
    isLoading,
    refetch,
  } = openpeepsApi.useConversations();
  const unseenCountsQuery = openpeepsApi.useUnseenPostCounts();
  const unseenByConversation = unseenCountsQuery.data?.direct ?? {};

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    refetch().then(() => {});
    setRefreshing(false);
  }, [refetch]);

  useEffect(() => {
    if (conversations) {
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
    }
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
  useSetPlusButtonActions(
    canCreate
      ? {
          title: t('conversations.newMessage'),
          action: () => openCreateConversation(),
        }
      : undefined
  );

  return (
    <View className="relative flex-1">
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerClassName="grow"
        className="w-full flex bg-background relative p-2"
      >
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && filteredConversations?.length === 0 && (
          <EmptyStateContainer type="messages" copyKey="conversations.empty" />
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
