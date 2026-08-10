import { Pressable, View } from 'react-native';
import React from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification, PublicPost } from '@openpeepshq/common';
import { MessageSquareIcon } from '~/components/icons';
import { profileName } from '~/lib/utils';
import { MessageCard } from '../../conversations/message-card';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

interface NotificationTypeProps {
  notification: PublicNotification;
}
export const DirectMessage: React.FC<NotificationTypeProps> = ({
  notification,
}) => {
  const profile = notification.senderProfile!;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const { conversationStart } = notification.data as {
    conversationStart: PublicPost;
  };

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}>
      <Pressable
        onPress={() =>
          navigation.navigate('Conversation', { id: conversationStart.id })
        }
        className="w-full ">
        <View className="mb-2 flex flex-row items-center gap-2 font-semibold flex-wrap">
          <MessageSquareIcon className="h-4 w-4 text-foreground" />
          <ThemedText className="text-foreground">
            {t('notification.directMessage.text', {
              profileName: profileName(profile),
            })}
          </ThemedText>
        </View>
        {notification.post && <MessageCard message={notification.post} />}
      </Pressable>
    </NotificationWrapper>
  );
};
