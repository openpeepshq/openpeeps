import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  apiErrorMessage,
  type JamJoinParams,
  useJoinWaitingRoomToken,
} from '@openpeepshq/react';
import type { SseError } from '@openpeepshq/fetch-client';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';

export interface JamRequestJoinProps {
  onJoin: (params: JamJoinParams) => void;
}

const JamWaitingRoomListener = ({
  onJoin,
}: {
  onJoin: JamRequestJoinProps['onJoin'];
}) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // The error state is not terminal: when the token is delivered (a fresh
  // stream after a reconnection or a moderator admission), the stale error
  // must not sit behind the recovered stream.
  const joinAndClearError = useCallback(
    (params: JamJoinParams) => {
      setError(null);
      onJoin(params);
    },
    [onJoin]
  );

  useJoinWaitingRoomToken(joinAndClearError, (e?: SseError) => {
    // Reuse the shared key→message mapping (`errorKey ?? key`, translate
    // `error.*` keys). The SSE path passes an empty fallback so a keyless,
    // message-less error renders nothing rather than a generic "Error".
    const message = apiErrorMessage(e, t, '');
    setError(message.length > 0 ? message : null);
  });

  return error ? (
    <ThemedText className="text-center text-sm text-destructive">
      {error}
    </ThemedText>
  ) : null;
};

export const JamRequestJoin = ({ onJoin }: JamRequestJoinProps) => {
  const { t } = useTranslation();
  const [requested, setRequested] = useState(false);

  return (
    <View className="w-full flex-1 items-center justify-center gap-4 p-4">
      {requested ? (
        <>
          <JamWaitingRoomListener onJoin={onJoin} />
          <ThemedText className="text-center text-sm text-muted-foreground">
            {t('jams.join.waitingForModerator')}
          </ThemedText>
        </>
      ) : (
        <Button onPress={() => setRequested(true)}>
          <ThemedText className="text-primary-foreground">
            {t('jams.join.requestToJoin')}
          </ThemedText>
        </Button>
      )}
    </View>
  );
};
