import { View } from 'react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Event, PublicPost, truncateText } from '@openpeepshq/common';
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
  const { t } = useTranslation();
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
          <ThemedText className="text-muted-foreground">
            {t('events.location.jam', { defaultValue: 'Jam Event' })}
          </ThemedText>
        </>
      ) : event.url ? (
        <>
          <LinkIcon className="text-muted-foreground" size={18} />
          <ThemedText className="text-muted-foreground">
            {t('events.location.online', { defaultValue: 'Online' })}
          </ThemedText>
        </>
      ) : null}
    </View>
  );
};
