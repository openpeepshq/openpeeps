import { useCallback, useState } from 'react';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useJoinWaitingRoomToken } from '../../hooks/jams/useJamParticipant';
import type { JamJoinParams } from '../../hooks/jams/useJamRoom';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

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
  const t = useT();
  const [error, setError] = useState<string | null>(null);

  // The error state is not terminal: when the token is delivered (a fresh
  // stream after a reconnection or a moderator admission), the stale error
  // must not sit behind the recovered stream.
  const joinAndClearError = useCallback(
    (params: JamJoinParams) => {
      setError(null);
      onJoin(params);
    },
    [onJoin],
  );

  useJoinWaitingRoomToken(
    joinAndClearError,
    (e) => {
      // Reuse the shared key→message mapping (`errorKey ?? key`, translate
      // `error.*` keys). The SSE path passes an empty fallback so a keyless,
      // message-less error renders nothing rather than a generic "Error".
      const message = apiErrorMessage(e, t, '');
      setError(message.length > 0 ? message : null);
    },
    onDenied,
  );

  return error ? (
    <p role="alert" className="text-destructive text-center text-sm">
      {error}
    </p>
  ) : null;
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
                defaultValue: 'The moderator declined your request to join',
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
