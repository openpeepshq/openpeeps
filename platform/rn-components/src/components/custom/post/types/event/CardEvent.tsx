import { View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useMemo } from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { Event, PublicPost, PublicRsvp } from '@openpeepshq/common';
import { truncateText } from '~/lib/utils';
import { useOpenpeeps } from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { calculateEffectiveRsvps } from '~/lib/utils';
import { Timespan } from '~/components/custom/date';
import { EventLocation } from '~/components/custom/post/pieces/EventLocation';
import { ProfileEventRelationship } from '~/components/custom/post/pieces/ProfileEventRelationship';
import { ParticipantsCard } from '~/components/custom/common';
import { useTranslation } from 'react-i18next';

interface CardEventProps {
  post: PublicPost;
}

export const CardEvent = ({ post }: CardEventProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();

  const event = post.data as Event;
  const jam = event.jam;
  const occurrenceId = post.occurrenceRecurrenceId;
  const { data: jamState, isLoading } = openpeepsApi.useJamState(
    post.id || '',
    occurrenceId
  );
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const rsvps = useMemo<PublicRsvp[]>(() => {
    return calculateEffectiveRsvps(post, occurrenceId) || [];
  }, [post, occurrenceId]);

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('Post', {
          id: post.id,
          occurrence: occurrenceId,
        });
      }}
      className="flex mb-6 w-full border-[0.5px] border-gray-100/50 rounded-lg"
    >
      <View className="w-full aspect-video overflow-hidden rounded-t-md">
        <Image
          source={
            event.image
              ? { uri: event.image }
              : require('~/assets/images/event-placeholder.png')
          }
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <View className="grid gap-y-5 p-4">
        <View className="flex-row items-center gap-x-1">
          <Timespan
            start={post.occurrenceStart ?? event.start}
            end={post.occurrenceEnd ?? event.end}
            timeZone={event.timeZone}
          />
        </View>
        {event.recurrence ? (
          <ThemedText className="text-muted-foreground text-xs">
            {t('events.repeat.badge')}
          </ThemedText>
        ) : null}
        <ThemedText className="text-xl font-semibold">
          {truncateText(event?.name, 100) || '-'}
        </ThemedText>
        <View className="flex flex-row gap-x-2">
          <EventLocation post={post} truncate={true} />
          <ProfileEventRelationship post={post} />
        </View>
        {jam && (
          <View className="flex w-full">
            {isLoading && <ActivityIndicator size={'small'} />}
            {!isLoading && jamState && (
              <View
                className={`flex justify-start ${
                  jamState?.participants?.length || 0 > 1 ? 'gap-5' : 'gap-2'
                }
               text-muted-foreground text-xs ${
                 (jamState?.participants?.length ?? 0) > 0 ? '-mt-4' : ''
               }`}
              >
                <View className="flex flex-row items-center gap-x-2">
                  {jamState?.participants?.length > 0 && (
                    <View className="-ml-5 w-12">
                      <ParticipantsCard jamState={jamState} />
                    </View>
                  )}
                  <ThemedText>
                    {rsvps.length} {rsvps?.length === 1 ? 'rsvp' : 'rsvps'}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
