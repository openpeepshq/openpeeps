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
  onDenied,
}: {
  onJoin: JamRequestJoinProps['onJoin'];
  onDenied: () => void;
}) {
  useJoinWaitingRoomToken(onJoin, onDenied);
  return null;
}

export function JamRequestJoin({ onJoin }: JamRequestJoinProps) {
  const t = useT();
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'denied'>('idle');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-4">
      {phase === 'waiting' ? (
        <>
          <JamWaitingRoomListener
            onJoin={onJoin}
            onDenied={() => setPhase('denied')}
          />
          <p className="text-muted-foreground text-center text-sm">
            {t('jams.join.waitingForModerator', {
              defaultValue: 'Waiting for a moderator to let you in',
            })}
          </p>
        </>
      ) : (
        <>
          {phase === 'denied' ? (
            <p className="text-muted-foreground text-center text-sm">
              {t('jams.join.rejected', {
                defaultValue: 'The host declined your request to join.',
              })}
            </p>
          ) : null}
          <Button variant="default" action={() => setPhase('waiting')}>
            {t('jams.join.requestToJoin', { defaultValue: 'Request to join' })}
          </Button>
        </>
      )}
    </div>
  );
}
