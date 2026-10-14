import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '../../ui/themed-text';
import { PublicNotification } from '@openpeepshq/common';
import { isWaitlistOfferNotice } from '@openpeepshq/common/lib';
import { NotificationWrapper } from '../NotificationWrapper';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '../../navigation/types/index';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { FeedPost } from '../../post';

interface NotificationTypeProps {
  notification: PublicNotification;
}

export const WaitlistOffer: React.FC<NotificationTypeProps> = ({
  notification,
}) => {
  const profile = notification.senderProfile ?? notification.post?.profile;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const post = notification.post;
  const eventName =
    post?.data?.type === 'event' ? post.data.name?.trim() : undefined;
  const notice = isWaitlistOfferNotice(notification.data)
    ? notification.data
    : undefined;
  if (!profile || !post) return null;

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <Pressable
        onPress={() => navigation.navigate('Post', { id: post.id })}
        className="w-full"
      >
        <View className="mb-2 flex flex-row flex-wrap items-center gap-2">
          <ThemedText className="font-semibold">
            {t('notification.waitlistOffer.text', {
              eventName:
                eventName || t('notification.waitlistOffer.eventFallback'),
            })}
          </ThemedText>
        </View>
        {notice?.offerExpiresAt ? (
          <ThemedText className="text-muted-foreground mb-2 text-sm">
            {t('notification.waitlistOffer.expires', {
              until: new Date(notice.offerExpiresAt).toLocaleString(),
            })}
          </ThemedText>
        ) : null}
        <FeedPost post={post} />
      </Pressable>
    </NotificationWrapper>
  );
};
