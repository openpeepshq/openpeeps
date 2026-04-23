import { Pressable, View } from 'react-native';
import React from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification } from '@openpeeps/common';
import { MegaphoneIcon } from '~/components/icons';
import { profileName } from '~/lib/utils';
import { UpdatingDate } from '../../date/updating-date';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

interface NotificationTypeProps {
  notification: PublicNotification;
}

export const Follow: React.FC<NotificationTypeProps> = ({ notification }) => {
  const profile = notification.senderProfile!;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}>
      <Pressable
        onPress={() =>
          navigation.navigate('Profile', {
            handle: notification.senderProfile?.id as string,
          })
        }
        className="w-full">
        <View className="flex w-full items-center justify-between">
          <View className="mb-2 flex flex-row items-center gap-2 font-semibold flex-wrap">
            <MegaphoneIcon className="h-4 w-4 text-foreground" />
            <ThemedText>
              {t('notification.follow.text', {
                profileName: profileName(profile),
              })}
            </ThemedText>
          </View>
        </View>
        <View className="ml-1 text-sm">
          <UpdatingDate date={notification.createdAt} />
        </View>
      </Pressable>
    </NotificationWrapper>
  );
};
