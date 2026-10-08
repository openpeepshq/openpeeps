import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  type JamJoinParams,
  useJoinWaitingRoomToken,
} from '@openpeepshq/react';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';

export interface JamRequestJoinProps {
  onJoin: (params: JamJoinParams) => void;
}

const JamWaitingRoomListener = ({
  onJoin,
}: {
  onJoin: JamRequestJoinProps['onJoin'];
}) => {
  useJoinWaitingRoomToken(onJoin);
  return null;
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
