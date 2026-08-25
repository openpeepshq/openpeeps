import React from 'react';
import { MainScreenProps } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeepshq/react';
import { ThemedView } from '~/components/ui/themed-view';
import {
  GenericHeader,
  OpenPeepsMarkdown,
  UpdatingDate,
} from '~/components/custom';
import { truncateText } from '~/lib/utils';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ThemedText } from '~/components/ui/themed-text';
import { ActivityIndicator, View } from 'react-native';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { useTranslation } from 'react-i18next';
import { getGroupAvatar } from '@openpeepshq/common';

type GroupInfoProps = MainScreenProps<'GroupInfo'>;

export const GroupInfo = ({ route }: GroupInfoProps) => {
  const { id } = route.params;
  const { openpeepsApi } = useOpenpeeps();
  const { data: groupData, isLoading } = openpeepsApi.useGroup(id);
  const { data: server } = openpeepsApi.useServerInfo();

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader
        title={
          <View className="flex-row gap-x-2 items-center">
            <Avatar alt={groupData?.displayName as string} className=" size-14">
              <AvatarImage
                source={{
                  uri:
                    groupData && server
                      ? getGroupAvatar(groupData, server.communityConfig)
                      : groupData?.avatar,
                }}
              />
            </Avatar>
            <ThemedText className="text-lg">
              {truncateText(groupData?.displayName, 30)}
            </ThemedText>
          </View>
        }
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative p-4">
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && (
          <>
            <ThemedText className="text-2xl">About Group</ThemedText>

            <View className="py-4 my-4 border-b-2 border-b-gray-500">
              <ThemedText className="text-lg font-semibold">
                Description
              </ThemedText>
              <OpenPeepsMarkdown source={groupData?.description || ''} />
            </View>
            <View className="py-4 my-4 border-b-2 border-b-gray-500 space-y-6">
              <ThemedText className="text-lg font-semibold">Details</ThemedText>


              <ThemedText className="">
                Anyone on this community can see posts in the group. Only group
                members can add comments and create posts.
              </ThemedText>
              <ThemedText className="font-semibold">Created</ThemedText>
              <UpdatingDate date={groupData?.createdAt as string} />
            </View>
            <View className="py-4 my-4">
              <ThemedText className="text-lg font-semibold">Rules</ThemedText>
              <OpenPeepsMarkdown source={groupData?.rules || ''} />
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};

interface GroupInfoAsComponentProps {
  id: string;
}

export const GroupInfoAsComponent: React.FC<GroupInfoAsComponentProps> = ({
  id,
}) => {
  const { openpeepsApi } = useOpenpeeps();
  const { data: groupData, isLoading } = openpeepsApi.useGroup(id);
  const { t } = useTranslation();

  const visibilityValue = groupData?.capabilities?.none?.add?.includes(
    'core-groups-read',
  )
    ? 'public'
    : groupData?.capabilities?.local?.add?.includes('core-groups-read')
      ? 'local'
      : 'private';

  const postsVisibilityValue = groupData?.capabilities?.none?.add?.includes(
    'core-posts-read',
  )
    ? 'public'
    : groupData?.capabilities?.local?.add?.includes('core-posts-read')
      ? 'local'
      : 'private';

  const whoCanJoinValue = groupData?.capabilities?.local?.add?.includes(
    'core-groups-join',
  )
    ? 'open'
    : 'closed';

  const whoCanPostValue = groupData?.capabilities?.member?.add?.includes(
    'core-posts-create-*',
  )
    ? 'members'
    : 'admin';
  const whoCanPostEventsValue =
    groupData?.capabilities?.member?.remove?.includes('core-posts-create-event')
      ? 'admin'
      : 'members';

  return (
    <ThemedView className="flex-1 relative">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full flex bg-background relative py-4">
        {isLoading && <ActivityIndicator size={'small'} />}
        {!isLoading && (
          <>
            <View className="border-b-2 border-b-gray-500">
              <ThemedText className="text-lg font-semibold">
                Description
              </ThemedText>
              <OpenPeepsMarkdown
                source={groupData?.description || t('groups.description.placeholder')}
              />
            </View>
            <View className="py-4 my-2 border-b-2 border-b-gray-500 flex gap-y-2">
              <ThemedText className="text-lg font-semibold">Details</ThemedText>
              <View>
                <ThemedText className="font-semibold">Created</ThemedText>
                <UpdatingDate date={groupData?.createdAt as string} />
              </View>
              <View>
                <ThemedText className="font-semibold">
                  {t('groups.visibility.title')}
                </ThemedText>
                <ThemedText className="">
                  {t(`groups.visibility.${visibilityValue}.description`)}
                </ThemedText>
              </View>
              <View>
                <ThemedText className="font-semibold">
                  {t('groups.whoCanJoin.title')}
                </ThemedText>
                <ThemedText className="">
                  {t(`groups.whoCanJoin.${whoCanJoinValue}.description`)}
                </ThemedText>
              </View>
              <View>
                <ThemedText className="font-semibold">
                  {t('groups.whoCanPost.title')}
                </ThemedText>
                <ThemedText className="">
                  {t(`groups.whoCanPost.${whoCanPostValue}.description`)}.{' '}
                  {t(
                    `groups.whoCanPostEvents.${whoCanPostEventsValue}.description`,
                  )}
                </ThemedText>
              </View>
              <View>
                <ThemedText className="font-semibold">
                  {t('groups.postsVisibility.title')}
                </ThemedText>
                <ThemedText className="">
                  {t(
                    `groups.postsVisibility.${postsVisibilityValue}.description`,
                  )}
                </ThemedText>
              </View>
            </View>
            <View className="py-4 my-4">
              <ThemedText className="text-lg font-semibold">Rules</ThemedText>
              <OpenPeepsMarkdown
                source={groupData?.rules || t('groups.rules.placeholder')}
              />
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </ThemedView>
  );
};
