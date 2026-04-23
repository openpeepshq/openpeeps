import { View } from 'react-native';
import React from 'react';
import { Event, PublicPost, truncateText } from '@openpeeps/common';
import { ThemedText } from '~/components/ui/themed-text';
import { MapPinIcon, LinkIcon, PhoneCallIcon } from '~/components/icons';
interface EventLocationProps {
  post: PublicPost;
  truncate?: boolean;
}
export const EventLocation: React.FC<EventLocationProps> = ({
  post,
  truncate = false,
}) => {
  const event = post.data as Event;

  return (
    <View className="flex-row items-center gap-x-2 text-muted-foreground">
      {event.physicalLocation ? (
        <>
          <MapPinIcon className="text-muted-foreground" size={18} />
          <ThemedText className="text-muted-foreground">
            {truncate
              ? truncateText(event.physicalLocation.text, 18)
              : event.physicalLocation.text}
          </ThemedText>
        </>
      ) : event.jam ? (
        <>
          <PhoneCallIcon className="text-muted-foreground" size={18} />
          <ThemedText className="text-muted-foreground">Jam Event</ThemedText>
        </>
      ) : event.url ? (
        <>
          <LinkIcon className="text-muted-foreground" size={18} />
          <ThemedText className="text-muted-foreground">Online</ThemedText>
        </>
      ) : null}
    </View>
  );
};
