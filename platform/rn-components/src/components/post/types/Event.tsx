import React from 'react';
import { Event, PublicPost } from '@openpeepshq/common';
import { formatEventRecurrence } from '@openpeepshq/common/lib';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { CachedImage } from '../../custom/common/index';
import { ParticipantAvatar } from '../../custom/common/participant-avatar';
import { ThemedText } from '../../ui/themed-text';
import { formatEventDate } from '../../../lib/utils';
import { MainStackParamList } from '../../navigation/types/index';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../ui/button';

export const FeedEvent = ({ post }: { post: PublicPost }) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const eventData = post.data as Event;
  const start = post.occurrenceStart ?? eventData.start;
  const end = post.occurrenceEnd ?? eventData.end;

  return (
    <View className="w-full flex-col gap-1">
      {eventData.image && (
        <View className="w-full aspect-video overflow-hidden rounded-md">
          <CachedImage
            url={eventData.image}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <ThemedText className="text-muted-foreground text-sm">
          {formatEventDate(start)}
          {end && ` - ${formatEventDate(end)}`}
          {eventData.timeZone && ` (${eventData.timeZone})`}
        </ThemedText>
        <Button
          variant="outline"
          size="sm"
          onPress={() => navigation.navigate('Post', { id: post.id })}
        >
          <ThemedText className="text-xs">
            {t('posts.event.viewEvent', { defaultValue: 'View Event' })}
          </ThemedText>
        </Button>
      </View>

      <ThemedText className="text-lg font-semibold">
        {eventData.name}
      </ThemedText>

      {eventData.recurrence ? (
        <ThemedText className="text-muted-foreground text-sm">
          {formatEventRecurrence(eventData.recurrence, t, eventData.start)}
        </ThemedText>
      ) : null}

      {eventData.url ? (
        <Pressable onPress={() => navigation.navigate('Post', { id: post.id })}>
          <ThemedText className="text-sm text-primary">
            🔗 {eventData.url}
          </ThemedText>
        </Pressable>
      ) : null}

      {eventData?.moderators && eventData.moderators.length > 0 ? (
        <View className="flex-row items-center gap-1">
          {eventData.moderators.slice(0, 2).map((moderator, index) => (
            <ParticipantAvatar key={index} profileId={moderator} />
          ))}
        </View>
      ) : null}
    </View>
  );
};
