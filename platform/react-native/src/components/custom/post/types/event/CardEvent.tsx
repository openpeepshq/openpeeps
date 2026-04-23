import { View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useMemo } from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { Event, PublicPost, PublicRsvp } from '@openpeeps/common';
import { truncateText } from '~/lib/utils';
import { useOpenpeeps } from '@openpeeps/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { calculateEffectiveRsvps } from '~/lib/utils';
import { Timespan } from '~/components/custom/date';
import { EventLocation } from '~/components/custom/post/pieces/EventLocation';
import { ProfileEventRelationship } from '~/components/custom/post/pieces/ProfileEventRelationship';
import { ParticipantsCard } from '~/components/custom/common';

interface CardEventProps {
  post: PublicPost;
}

export const CardEvent = ({ post }: CardEventProps) => {
  const { openpeepsApi } = useOpenpeeps();

  const event = post.data as Event;
  const jam = event.jam;
  const { data: jamState, isLoading } = openpeepsApi.useJamState(post.id || '');
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const rsvps = useMemo<PublicRsvp[]>(() => {
    return calculateEffectiveRsvps(post) || [];
  }, [post]);

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('EventPage', {
          id: post.id,
        });
      }}
      className="flex mb-6 w-full border-[0.5px] border-gray-100/50 rounded-lg">
      <View className="w-full h-[200px]">
        <Image
          source={
            event.image
              ? { uri: event.image }
              : require('~/assets/images/event-placeholder.png')
          }
          className="w-full h-full rounded-t-md"
        />
      </View>
      <View className="grid gap-y-5 p-4">
        <View className="flex-row items-center gap-x-1">
          <Timespan {...event} />
        </View>
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
                className={`flex justify-start ${jamState?.participants?.length || 0 > 1 ? 'gap-5' : 'gap-2'
                  }
               text-surface-600 text-xs ${(jamState?.participants?.length ?? 0) > 0 ? '-mt-4' : ''
                  }`}>
                <View className="flex flex-row items-center gap-x-2">
                  {jamState?.participants?.length > 0 && (
                    <View className="-ml-5 w-12">
                      <ParticipantsCard jamState={jamState} />
                    </View>
                  )}
                  <ThemedText>
                    {rsvps.length}{' '}
                    {rsvps?.length === 1 ? 'rsvp' : 'rsvps'}
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
