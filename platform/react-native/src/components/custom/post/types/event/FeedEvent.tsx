import React from 'react';
import { Event, PublicPost } from '@openpeeps/common';
import { Image, View } from 'react-native';
import { ParticipantAvatar } from '~/components/custom/common/participant-avatar';
import { ThemedText } from '~/components/ui/themed-text';
import { formatEventDate } from '~/lib/utils';

export const FeedEvent = ({ post }: { post: PublicPost }) => {


    const eventData = post.data as Event;
    return (<>
        {eventData.image && (
            <Image
                source={{ uri: eventData.image }}
                className="w-full h-56"
                resizeMode="cover"
            />
        )}

        <View className="p-4">
            <ThemedText className="text-muted-foreground text-sm mb-2">
                {formatEventDate(eventData.start)}
                {eventData.end && ` - ${formatEventDate(eventData.end)}`}
                {eventData.timeZone && ` (${eventData.timeZone})`}
            </ThemedText>

            <ThemedText className="text-xl font-semibold mb-3">
                {eventData.name}
            </ThemedText>

            {eventData.url && (
                <ThemedText className="text-muted-foreground mb-3">
                    🔗 {eventData.url}
                </ThemedText>
            )}

            <View className="flex-row items-center">
                {eventData?.moderators?.slice(0, 2).map((moderator, index) => (
                    <ParticipantAvatar key={index} profileId={moderator} />
                ))}
            </View>
        </View>
    </>);
};
