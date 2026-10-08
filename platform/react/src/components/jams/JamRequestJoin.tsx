import { useState } from 'react';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useJoinWaitingRoomToken } from '../../hooks/jams/useJamParticipant';
import type { JamJoinParams } from '../../hooks/jams/useJamRoom';

export interface JamRequestJoinProps {
  onJoin: (params: JamJoinParams) => void;
}

function JamWaitingRoomListener({
  onJoin,
}: {
  onJoin: JamRequestJoinProps['onJoin'];
}) {
  useJoinWaitingRoomToken(onJoin);
  return null;
}

export function JamRequestJoin({ onJoin }: JamRequestJoinProps) {
  const t = useT();
  const [requested, setRequested] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-4">
      {requested ? (
        <>
          <JamWaitingRoomListener onJoin={onJoin} />
          <p className="text-muted-foreground text-center text-sm">
            {t('jams.join.waitingForModerator', {
              defaultValue: 'Waiting for a moderator to admit you…',
            })}
          </p>
        </>
      ) : (
        <Button variant="default" action={() => setRequested(true)}>
          {t('jams.join.requestToJoin', { defaultValue: 'Request to join' })}
        </Button>
      )}
    </div>
  );
}
