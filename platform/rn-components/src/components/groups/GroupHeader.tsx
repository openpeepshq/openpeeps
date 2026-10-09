import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { groupName } from '@openpeepshq/common/lib';
import { useCurrentProfile } from '@openpeepshq/react';
import { MainStackParamList } from '../navigation/types/index';
import { ThemedText } from '../ui/themed-text';
import { GroupAvatar } from './GroupAvatar';
import { GroupOptionsMenu } from './GroupOptionsMenu';
import { GroupShareMenu } from './GroupShareMenu';
import { JoinGroupButton } from './JoinGroupButton';

export interface GroupHeaderProps {
  group: GroupWithMeta;
}

export const GroupHeader = ({ group }: GroupHeaderProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const me = useCurrentProfile();
  const isMember = me?.memberships?.some((m) => m.group.id === group.id);

  return (
    <View className="relative">
      <View className="relative aspect-[3/1] w-full bg-muted">
        <Image
          source={
            group.header
              ? { uri: group.header }
              : require('../../assets/images/group-header-placeholder.png')
          }
          className="h-full w-full"
          resizeMode="cover"
        />
        <View className="absolute -bottom-12 left-4">
          <GroupAvatar group={group} className="size-24" />
        </View>
      </View>
      <View className="flex-row justify-end gap-x-2 p-2">
        {!isMember ? (
          <JoinGroupButton group={group} />
        ) : (
          <>
            <GroupShareMenu group={group} />
            <GroupOptionsMenu group={group} />
          </>
        )}
      </View>
      <View className="mb-8 p-2 pt-6">
        <ThemedText className="text-xl font-semibold">
          {groupName(group)}
        </ThemedText>
        <ThemedText className="text-sm text-muted-foreground">
          @{group.handle}
        </ThemedText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('groups.viewMembers')}
          onPress={() => navigation.navigate('GroupMembers', { id: group.id })}
        >
          <ThemedText className="text-sm text-muted-foreground">
            {group.membersCount} member{group.membersCount === 1 ? '' : 's'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
};
