import { View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React from 'react';
import { ThemedText } from '../../../ui/themed-text';
import { Event, PublicPost } from '@openpeepshq/common';
import { truncateText } from '../../../../lib/utils';
import { canModerateJam, formatEventRecurrence } from '@openpeepshq/common/lib';
import {
  useOpenpeeps,
  useCurrentProfile,
  useServerInfo,
} from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../../navigation/types/index';
import { Button } from '../../../ui/button';
import { Timespan } from '../../../custom/date/index';
import { EventLocation } from '../../pieces/EventLocation';
import { ProfileEventRelationship } from './ProfileEventRelationship';

import { useTranslation } from 'react-i18next';

import { ParticipantsCard } from '../../index';
export interface CardEventProps {
  post: PublicPost;
  showEventDate?: boolean;
}

export const CardEvent = ({ post, showEventDate = true }: CardEventProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const livekitEnabled = useServerInfo().jams.livekit.enabled;

  const event = post.data as Event;
  const jam = event.jam;
  const occurrenceId = post.occurrenceRecurrenceId;
  const { data: jamState, isLoading } = openpeepsApi.useJamState(
    post.id || '',
    occurrenceId
  );
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const attendeesLength = jamState?.participants.length ?? 0;

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('Post', {
          id: post.id,
          occurrence: occurrenceId,
        });
      }}
      className="mb-6 w-full rounded-lg border border-border"
    >
      <View className="w-full aspect-video overflow-hidden rounded-t-md">
        <Image
          source={
            event.image
              ? { uri: event.image }
              : require('../../../../assets/images/event-placeholder.png')
          }
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <View className="grid gap-y-5 p-4">
        {showEventDate ? (
          <View className="flex-row items-center gap-x-1">
            <Timespan
              start={post.occurrenceStart ?? event.start}
              end={post.occurrenceEnd ?? event.end}
              timeZone={event.timeZone}
            />
          </View>
        ) : null}
        {event.recurrence ? (
          <ThemedText className="text-muted-foreground text-sm">
            {formatEventRecurrence(event.recurrence, t, event.start)}
          </ThemedText>
        ) : null}
        <ThemedText className="text-xl font-semibold">
          {truncateText(event?.name, 100) || '-'}
        </ThemedText>
        <View className="flex flex-row gap-x-2">
          <EventLocation post={post} truncate={true} />
          <ProfileEventRelationship post={post} />
        </View>
        {jam && me && livekitEnabled ? (
          isLoading ? (
            <ActivityIndicator size="small" />
          ) : jamState?.active ? (
            <View className="flex flex-row items-center gap-x-2 text-xs text-muted-foreground">
              <View className="w-12">
                <ParticipantsCard jamState={jamState} />
              </View>
              <ThemedText>
                {attendeesLength}{' '}
                {attendeesLength === 1
                  ? t('events.jam.attendee', { defaultValue: 'attendee' })
                  : t('events.jam.attendees', {
                      defaultValue: 'attendees',
                    })}
              </ThemedText>
              <Button
                variant="default"
                size="sm"
                onPress={() =>
                  navigation.navigate('JamSession', {
                    jamId: post.id,
                    occurrence: occurrenceId,
                  })
                }
              >
                <ThemedText numberOfLines={1}>
                  {t('jam.join.submit', { defaultValue: 'Join Jam' })}
                </ThemedText>
              </Button>
            </View>
          ) : canModerateJam(me, post) ? (
            <Button
              className="mt-2 w-full"
              onPress={() =>
                navigation.navigate('JamSession', {
                  jamId: post.id,
                  occurrence: occurrenceId,
                })
              }
            >
              <ThemedText numberOfLines={1}>
                {t('jam.start.submit', { defaultValue: 'Start Jam' })}
              </ThemedText>
            </Button>
          ) : null
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
