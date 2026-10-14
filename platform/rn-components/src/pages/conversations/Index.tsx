import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useMemo, useRef, useState } from 'react';
import {
  MessageCircleOffIcon,
  MessageSquarePlusIcon,
} from '../../components/icons/index';
import { ThemedText } from '../../components/ui/themed-text';
import {
  useSetPageHeader,
  useSetPlusButtonActions,
} from '../../components/layout';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuthData, useOpenpeeps } from '@openpeepshq/react';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '../../components/navigation/types/index';
import { canCreatePost } from '@openpeepshq/common';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  ConversationPreviewCard,
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

  const headerTabs = (
    <View className="flex-row">
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

  useSetPageHeader(t('navigation.messages'), headerTabs);

  useSetPlusButtonActions(
    canCreate
      ? {
          title: t('conversations.newMessage'),
          icon: MessageSquarePlusIcon,
          action: () => openCreateConversation(),
        }
      : undefined
  );

  const isLoading = activeQuery.isLoading;

  return (
    <View className="flex-1">
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerClassName="grow"
        className="w-full flex bg-background relative p-2"
      >
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && conversations?.length === 0 && (
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
          conversations?.map((conversation, idx) => (
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
