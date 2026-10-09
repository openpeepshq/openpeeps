import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common/types';
import { isCapacityEvent } from '@openpeepshq/common/lib';
import { useCurrentProfile, useRouter } from '@openpeepshq/react';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';
import { EventRsvpButton } from '../post/pieces/EventRsvpButton';
import { JamRoomPanel, JamRoomPanelLink } from './JamRoomPanel';

export interface JamCapacityGateProps {
  jamPost: PublicPost;
  reason: 'full' | 'rsvp-required' | 'removed';
  eventName?: string;
  occurrence?: string;
}

export const JamCapacityGate = ({
  jamPost,
  reason,
  eventName,
  occurrence,
}: JamCapacityGateProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const router = useRouter();
  const eventData = jamPost.data?.type === 'event' ? jamPost.data : undefined;
  const showRsvp =
    reason === 'rsvp-required' &&
    !!me &&
    !!eventData &&
    isCapacityEvent(eventData);

  const message =
    reason === 'full'
      ? t('error.eventAtCapacity')
      : reason === 'removed'
        ? t('events.rsvp.removedMessage')
        : t('error.jamRsvpRequired');

  return (
    <JamRoomPanel title={eventName}>
      <ThemedText className="text-center text-sm">{message}</ThemedText>
      {showRsvp ? (
        <View className="w-full px-2">
          <EventRsvpButton
            post={jamPost}
            recurrenceId={occurrence}
            lockToOccurrence
          />
        </View>
      ) : null}
      <JamRoomPanelLink
        label={t('jams.room.viewEvent')}
        onPress={() => router.navigate({ type: 'post', id: jamPost.id })}
      />
      {me ? (
        <Button onPress={() => router.navigate({ type: 'jams' })}>
          <ThemedText className="text-sm text-primary-foreground">
            {t('jams.discover.checkOtherJams')}
          </ThemedText>
        </Button>
      ) : (
        <View className="items-center gap-2">
          <Button
            onPress={() => router.navigate({ type: 'auth', mode: 'login' })}
          >
            <ThemedText className="text-sm text-primary-foreground">
              {t('navigation.logIn')}
            </ThemedText>
          </Button>
          <ThemedText className="text-sm text-muted-foreground">
            {t('navigation.haveAccount')}{' '}
            <ThemedText
              className="text-sm underline"
              onPress={() =>
                router.navigate({ type: 'auth', mode: 'register' })
              }
            >
              {t('navigation.joinCommunity')}
            </ThemedText>
          </ThemedText>
        </View>
      )}
    </JamRoomPanel>
  );
};
