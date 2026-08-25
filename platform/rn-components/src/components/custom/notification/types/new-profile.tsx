import { Pressable, View } from 'react-native';
import React from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification } from '@openpeepshq/common';
import { profileName } from '~/lib/utils';
import { UpdatingDate } from '../../date/updating-date';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

interface NotificationTypeProps {
  notification: PublicNotification;
}
export const NewProfile: React.FC<NotificationTypeProps> = ({ notification }) => {
  const profile = notification.senderProfile;
  const { t } = useTranslation();
  if (!profile) {
    return null;
  }
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}>
      <View className="w-full px-4">
        <View className="flex items-center gap-1 flex-wrap">
          <Pressable
            onPress={() =>
              navigation.navigate('Profile', { handle: profile.handle })
            }>
            <ThemedText className="flex items-center gap-2 text-base">
              {t('notification.newProfile.text', {
                profileName: profileName(profile) || profile.handle,
              })}
            </ThemedText>
          </Pressable>
          <View className="ml-1 text-sm">
            <UpdatingDate date={notification.createdAt} />
          </View>
        </View>
      </View>
    </NotificationWrapper>
  );
};
