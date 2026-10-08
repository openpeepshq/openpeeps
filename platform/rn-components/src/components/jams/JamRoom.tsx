import React, { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common/types';
import { JamProvider, useJamRoom, useRouter } from '@openpeepshq/react';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import { JamCapacityGate } from './JamCapacityGate';
import { JamLobby } from './JamLobby';
import { JamRequestJoin } from './JamRequestJoin';
import { JamRoomPanel, JamRoomPanelLink } from './JamRoomPanel';
import { JamVideoCall } from './JamVideoCall';

export interface JamRoomProps {
  jamPost: PublicPost;
  /** When true, connect immediately as observer without a lobby. */
  observer?: boolean;
  occurrence?: string;
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <View className="w-full flex-1 items-center justify-center gap-2 p-4">
    {children}
  </View>
);

const JamRoomInner = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    me,
    post,
    jamPost,
    jamEvent,
    observer,
    occurrence,
    livekitEnabled,
    connection,
    reconnectPrefs,
    reconnectError,
    observerError,
    autoRsvpError,
    shouldAutoRsvp,
    capacityBlock,
    canDirectJoin,
    canRequestJoin,
    handleJoin,
    handleDisconnected,
    tryReconnect,
  } = useJamRoom();

  // Retry when the app returns to the foreground (web: `visibilitychange`).
  useEffect(() => {
    if (!reconnectPrefs) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void tryReconnect(reconnectPrefs);
    });
    return () => subscription.remove();
  }, [reconnectPrefs, tryReconnect]);

  if (!livekitEnabled) {
    return (
      <JamRoomPanel title={jamEvent.name}>
        <ThemedText className="text-center">
          {t('jams.unavailable.message')}
        </ThemedText>
        <JamRoomPanelLink
          label={t('jams.room.viewEvent')}
          onPress={() => router.navigate({ type: 'post', id: jamPost.id })}
        />
      </JamRoomPanel>
    );
  }

  if (connection) {
    return (
      <JamVideoCall
        token={connection.token}
        serverUrl={connection.livekitUrl}
        audio={connection.audio}
        video={connection.video}
        onDisconnected={handleDisconnected}
      />
    );
  }

  if (reconnectPrefs) {
    return (
      <Centered>
        <ThemedText className="text-center text-lg">
          {t('jams.room.reconnecting')}
        </ThemedText>
        {reconnectError ? (
          <ThemedText className="text-center text-sm text-destructive">
            {reconnectError}
          </ThemedText>
        ) : null}
      </Centered>
    );
  }

  if (observer) {
    return (
      <Centered>
        {observerError ? (
          <ThemedText className="text-center text-sm text-destructive">
            {observerError}
          </ThemedText>
        ) : (
          <ThemedText className="text-center text-lg">
            {t('jams.room.observerConnecting')}
          </ThemedText>
        )}
      </Centered>
    );
  }

  if (shouldAutoRsvp && !autoRsvpError) {
    return (
      <Centered>
        <ThemedText className="text-center text-lg">
          {t('jams.room.autoRsvpInProgress')}
        </ThemedText>
      </Centered>
    );
  }

  if (capacityBlock.blocked) {
    return (
      <JamCapacityGate
        jamPost={post}
        reason={capacityBlock.reason}
        eventName={jamEvent.name}
        occurrence={occurrence}
      />
    );
  }

  if (canDirectJoin) {
    return <JamLobby onJoin={handleJoin} />;
  }

  if (canRequestJoin) {
    return <JamRequestJoin onJoin={handleJoin} />;
  }

  return (
    <JamRoomPanel title={jamEvent.name}>
      <ThemedText>{t('jams.room.jamNotActive')}</ThemedText>
      {me ? (
        <Button onPress={() => router.navigate({ type: 'jams' })}>
          <ThemedText className="text-sm text-primary-foreground">
            {t('jams.discover.checkOtherJams')}
          </ThemedText>
        </Button>
      ) : (
        <>
          <Button
            onPress={() => router.navigate({ type: 'auth', mode: 'register' })}
          >
            <ThemedText className="text-sm text-primary-foreground">
              {t('navigation.joinCommunity')}
            </ThemedText>
          </Button>
          <ThemedText>
            {t('navigation.haveAccount')}{' '}
            <ThemedText
              className="underline"
              onPress={() => router.navigate({ type: 'auth', mode: 'login' })}
            >
              {t('navigation.logIn')}
            </ThemedText>
          </ThemedText>
        </>
      )}
    </JamRoomPanel>
  );
};

/**
 * Top-level jam screen. Decides whether to render the lobby, the live video
 * call, an "access denied / jam not active" screen, or — for observers —
 * auto-connects via the join token. Everything below lives inside the
 * `<JamProvider>`.
 */
export const JamRoom = ({
  jamPost,
  observer = false,
  occurrence,
}: JamRoomProps) => (
  <JamProvider jamPost={jamPost} observer={observer} occurrence={occurrence}>
    <JamRoomInner />
  </JamProvider>
);
