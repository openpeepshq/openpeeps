import React from 'react';
import { Event, PublicPost } from '@openpeepshq/common';
import { formatEventRecurrence } from '@openpeepshq/common/lib';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CachedImage } from '~/components/custom/common';
import { ParticipantAvatar } from '~/components/custom/common/participant-avatar';
import { ThemedText } from '~/components/ui/themed-text';
import { formatEventDate } from '~/lib/utils';

export const FeedEvent = ({ post }: { post: PublicPost }) => {
  const { t } = useTranslation();
  const eventData = post.data as Event;
  const start = post.occurrenceStart ?? eventData.start;
  const end = post.occurrenceEnd ?? eventData.end;

  return (
    <>
      {eventData.image && (
        <View className="w-full aspect-video overflow-hidden">
          <CachedImage
            url={eventData.image}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      )}

      <View className="p-4">
        <ThemedText className="text-muted-foreground text-sm mb-2">
          {formatEventDate(start)}
          {end && ` - ${formatEventDate(end)}`}
          {eventData.timeZone && ` (${eventData.timeZone})`}
        </ThemedText>

        <ThemedText className="text-xl font-semibold mb-3">
          {eventData.name}
        </ThemedText>

        {eventData.recurrence ? (
          <ThemedText className="text-muted-foreground text-sm mb-3">
            {formatEventRecurrence(eventData.recurrence, t, eventData.start)}
          </ThemedText>
        ) : null}

        {eventData.url && (
          <ThemedText className="text-muted-foreground mb-3">
            🔗 {eventData.url}
          </ThemedText>
        )}

        <View className="flex-row items-center">
          {eventData?.moderators
            ?.slice(0, 2)
            .map((moderator, index) => (
              <ParticipantAvatar key={index} profileId={moderator} />
            ))}
        </View>
      </View>
    </>
  );
};
