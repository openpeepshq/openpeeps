import { Pressable, View } from 'react-native';
import React from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification, GroupWithMeta } from '@openpeeps/common';
import { UsersIcon } from '~/components/icons';
import { profileName } from '~/lib/utils';
import { UpdatingDate } from '../../date/updating-date';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
interface NotificationTypeProps {
  notification: PublicNotification;
}
export const NewGroupMember: React.FC<NotificationTypeProps> = ({
  notification,
}) => {
  const profile = notification.senderProfile!;
  const group = notification.group as GroupWithMeta;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}>
      <View className="w-full">
        <View className="w-full flex items-center gap-x-4 flex-wrap">
          <UsersIcon className="text-surface-500 h-8 w-8" />
          <ProfileAvatar profile={profile} className="size-16" />
        </View>
        <View className="mt-2 flex gap-x-2 flex-row flex-wrap">
          <ThemedText>
            {t('notification.newGroupMember.text', {
              profileName: profileName(profile),
            })}{' '}
          </ThemedText>
          <Pressable
            onPress={() =>
              navigation.navigate('Group', { handle: group.handle })
            }>
            <ThemedText className="font-bold">{group.displayName}</ThemedText>
          </Pressable>
          <View className="ml-2">
            <UpdatingDate date={notification.createdAt} />
          </View>
        </View>
      </View>
    </NotificationWrapper>
  );
};
