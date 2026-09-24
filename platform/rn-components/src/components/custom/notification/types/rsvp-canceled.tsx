import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { PublicNotification } from '@openpeepshq/common';
import {
  isRsvpCancelNotice,
  profileName,
  rsvpCancelWhenLabels,
} from '@openpeepshq/common/lib';
import { NotificationWrapper } from '../NotificationWrapper';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { FeedPost } from '../../post';

interface NotificationTypeProps {
  notification: PublicNotification;
}

export const RsvpCanceled: React.FC<NotificationTypeProps> = ({
  notification,
}) => {
  const profile = notification.senderProfile!;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const post = notification.post;
  const eventName =
    post?.data?.type === 'event' ? post.data.name?.trim() : undefined;
  const notice = isRsvpCancelNotice(notification.data)
    ? notification.data
    : { occurrenceIds: [], series: false };
  const when = post ? rsvpCancelWhenLabels(post, notice) : undefined;
  const whenLabel = when?.series
    ? t('notification.rsvpCanceled.series')
    : when?.labels.join(', ');

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}
    >
      <Pressable
        onPress={() =>
          navigation.navigate('Post', { id: notification.post?.id as string })
        }
        className="w-full"
      >
        <View className="mb-2 flex flex-row flex-wrap items-center gap-2">
          <ThemedText className="font-semibold">
            {t('notification.rsvpCanceled.text', {
              profileName: profileName(profile),
              eventName:
                eventName || t('notification.rsvpCanceled.eventFallback'),
            })}
          </ThemedText>
        </View>
        {whenLabel ? (
          <ThemedText className="text-muted-foreground mb-1 text-sm">
            {whenLabel}
          </ThemedText>
        ) : null}
        <ThemedText className="text-muted-foreground mb-2 text-xs">
          {new Date(notification.createdAt).toLocaleString()}
        </ThemedText>
        {post ? <FeedPost post={post} /> : null}
      </Pressable>
    </NotificationWrapper>
  );
};
