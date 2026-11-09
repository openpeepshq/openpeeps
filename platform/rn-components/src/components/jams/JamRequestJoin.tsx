import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  type JamJoinParams,
  useJoinWaitingRoomToken,
} from '@openpeepshq/react';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';

export interface JamRequestJoinProps {
  onJoin: (params: JamJoinParams) => void;
}

const JamWaitingRoomListener = ({
  onJoin,
  onDenied,
}: {
  onJoin: JamRequestJoinProps['onJoin'];
  onDenied: () => void;
}) => {
  useJoinWaitingRoomToken(onJoin, onDenied);
  return null;
};

export const JamRequestJoin = ({ onJoin }: JamRequestJoinProps) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'denied'>('idle');

  return (
    <View className="w-full flex-1 items-center justify-center gap-4 p-4">
      {phase === 'waiting' ? (
        <>
          <JamWaitingRoomListener
            onJoin={onJoin}
            onDenied={() => setPhase('denied')}
          />
          <ThemedText className="text-center text-sm text-muted-foreground">
            {t('jams.join.waitingForModerator')}
          </ThemedText>
        </>
      ) : (
        <>
          {phase === 'denied' ? (
            <ThemedText className="text-center text-sm text-muted-foreground">
              {t('jams.join.rejected')}
            </ThemedText>
          ) : null}
          <Button onPress={() => setPhase('waiting')}>
            <ThemedText className="text-primary-foreground">
              {t('jams.join.requestToJoin')}
            </ThemedText>
          </Button>
        </>
      )}
    </View>
  );
};
