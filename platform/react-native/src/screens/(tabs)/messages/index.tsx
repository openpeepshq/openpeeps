import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useRef } from 'react';
import {
  TabScreensHeader,
  EmptyStateContainer,
} from '~/components/custom';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  MessageSquarePlusIcon,
  XIcon,
  SearchIcon,
} from '~/components/icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  TabStackParamList,
  MainStackParamList,
} from '~/components/navigation/types';
import { PublicPost } from '@openpeepshq/common';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { Input } from '~/components/ui/input';
import { ThemedText } from '~/components/ui/themed-text';
import { profileMatchesQuery } from '~/lib/utils';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ConversationSettingsSheet } from '~/components/custom';
import { ConversationPreviewCard } from '~/components/custom/conversations';
import { useTranslation } from 'react-i18next';

type MessagesProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'Messages'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const Messages: React.FC<MessagesProps> = ({ navigation }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const settingsRef = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const { clearMembers, setContt } = useNewConversationStore();
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
    refetch().then(() => { });
    setRefreshing(false);
  }, [refetch]);

  useEffect(() => {
    if (conversations) {
      const filtered = conversations.filter(conversation =>
        conversation.some(
          message =>
            message?.data?.content
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            profileMatchesQuery(message.profile, searchQuery),
        ),
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);

  return (
    <View className="flex-1 relative">
      <TabScreensHeader
        children={
          <View className="flex-row items-center justify-between p-4">
            {!isSearchToggled && (
              <ThemedText className="text-2xl font-semibold">
                  {t('navigation.messages')}
              </ThemedText>
            )}
            <View
              className={`${isSearchToggled
                ? 'flex justify-end '
                : 'flex-row items-center gap-x-6'
                }`}>
              {isSearchToggled ? (
                <View className="ml-4 w-full flex-row flex justify-end">
                  <Input
                    className="flex-1"
                    placeholder="Search"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <TouchableOpacity
                    className="items-center justify-center px-4"
                    onPress={() => {
                      setSearchQuery('');
                      setIsSearchToggled(false);
                    }}>
                    <XIcon size={24} className="text-foreground" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setIsSearchToggled(true)}>
                    <SearchIcon size={20} className="text-foreground" />
                  </TouchableOpacity>
                  {/* TODO Uncomment when conversation settings are implemented */}
                  {/* <TouchableOpacity onPress={handleSettingsPress}>
                    <Settings2Icon size={20} className="text-foreground" />
                  </TouchableOpacity> */}
                </>
              )}
            </View>
          </View>
        }
      />
      <KeyboardAwareScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative p-2">
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && filteredConversations?.length === 0 && (
          <EmptyStateContainer type="messages" />
        )}
        {!isLoading &&
          filteredConversations?.map((conversation, idx) => (
            <ConversationPreviewCard
              key={idx}
              conversation={conversation}
              unreadCount={
                conversation[0]?.id
                  ? unseenByConversation[conversation[0].id] ?? 0
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
      <Pressable
        onPress={() => {
          clearMembers();
          setContt('');
          navigation.navigate('SelectPrivateMessageMembers');
        }}
        className="z-20 absolute bottom-10 right-6 size-16 flex items-center justify-center bg-foreground rounded-full">
        <MessageSquarePlusIcon size={24} className="text-background" />
      </Pressable>
      <ConversationSettingsSheet
        ref={settingsRef}
        onMessageRequestChange={value => {
          console.log('Message requests:', value);
        }}
        onReadReceiptsChange={value => {
          console.log('Read receipts:', value);
        }}
      />
    </View>
  );
};
