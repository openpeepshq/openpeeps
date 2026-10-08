import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import { groupName } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '@openpeepshq/react';
import { GenericHeader } from '~/components/custom';
import { AddGroupMembersButton, GroupMembersList } from '~/components/groups';
import { MainScreenProps } from '~/components/navigation/types';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ThemedText } from '~/components/ui/themed-text';
import { truncateText } from '~/lib/utils';

type GroupMembersProps = MainScreenProps<'GroupMembers'>;

export const GroupMembers = ({ route }: GroupMembersProps) => {
  const { id } = route.params;
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const groupQuery = openpeepsApi.useGroup(id);
  const group = groupQuery.data;

  const title = group
    ? `${truncateText(groupName(group), 20)} - ${t('groups.members.title')}`
    : t('groups.members.title');

  return (
    <ThemedSafeAreaView className="relative flex-1">
      <GenericHeader
        title={title}
        rightElement={group ? <AddGroupMembersButton group={group} /> : null}
      />
      <KeyboardAwareScrollView
        contentContainerClassName="grow"
        className="relative flex w-full bg-background"
      >
        {groupQuery.isLoading ? (
          <ActivityIndicator size="small" />
        ) : !group ? (
          <View className="flex-1 items-center justify-center p-8">
            <ThemedText className="text-2xl font-bold">
              {t('groups.notFound')}
            </ThemedText>
          </View>
        ) : (
          <GroupMembersList group={group} />
        )}
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};
