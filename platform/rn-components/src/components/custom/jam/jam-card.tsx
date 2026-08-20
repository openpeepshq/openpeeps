import { Image, View } from 'react-native';
import React from 'react';
import { Event, PublicPost } from '@openpeepshq/common';
import { ThemedText } from '~/components/ui/themed-text';
import { UpdatingDate } from '../date/updating-date';
import { useOpenpeeps } from '@openpeepshq/react';
import { ParticipantAvatar } from '../common/participant-avatar';
import { JamActionsFooter } from './jam-actions-footer';

interface JamCardProps {
  jamPost: PublicPost;
  type?: 'upcoming' | 'my-jams' | 'recorded-jams';
}

export const JamCard = ({
  jamPost,
  type = 'upcoming',
}: JamCardProps) => {
  const { currentProfile } = useOpenpeeps();
  const jamEvent = jamPost?.data as Event;
  const jam = jamEvent?.jam;
  return jamEvent && (
    <>
      {jamPost.data?.type === 'event' && (
        <View className="flex flex-row gap-x-4 mb-4 w-full">
          <View className="size-24">
            <Image
              source={require('~/assets/images/jam-placeholder.png')}
              className="w-full h-full rounded-md"
            />
          </View>
          <View className=" flex flex-col gap-y-3 h-full">
            <View className="flex flex-row gap-x-1 items-center">
              <ThemedText>Happening</ThemedText>
              <UpdatingDate date={jamEvent?.start} />
            </View>
            <ThemedText className="text-lg font-semibold">
              {jamEvent?.name || 'Jam'}
            </ThemedText>
            <View className=" flex flex-row flex-wrap gap-x-2">
              {currentProfile?.id === jamPost.profile?.id && (
                <ThemedText className="px-3 py-1 rounded-full text-sm bg-muted-foreground">
                  Owner
                </ThemedText>
              )}
              {jam?.moderators?.includes(currentProfile?.id as string) && (
                <ThemedText className="px-3 py-1 rounded-full text-sm bg-muted-foreground">
                  Moderator
                </ThemedText>
              )}
            </View>
            <View className=" flex flex-row items-center">
              {jam?.moderators?.slice(0, 2).map((moderator, index) => (
                <ParticipantAvatar key={index} profileId={moderator} />
              ))}
              {(jam?.moderators?.length ?? 0) > 2 && (
                <ThemedText className="ml-1">
                  +{(jam?.moderators?.length ?? 0) - 2}
                </ThemedText>
              )}
              {type === 'recorded-jams' ? (
                <ThemedText className="ml-2">attended</ThemedText>
              ) : (
                <ThemedText className="ml-2">will be attending</ThemedText>
              )}
            </View>
            <JamActionsFooter jamPost={jamPost} />
          </View>
        </View>
      )}
    </>
  );
};
