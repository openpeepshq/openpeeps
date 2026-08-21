import { useEffect, useState } from 'react';
import type { LocalUserChoices } from '@livekit/components-react';
import { Button } from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useJamContext } from './JamContext';

export interface JamRequestJoinProps {
  onJoin: (params: {
    token: string;
    livekitUrl: string;
    choices: LocalUserChoices;
  }) => void;
}

function JamWaitingRoomListener({
  onJoin,
}: {
  onJoin: JamRequestJoinProps['onJoin'];
}) {
  const { jamPost, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const tokenResponse = openpeepsApi.useJoinWaitingRoomStream(
    jamPost.id,
    occurrence,
  );

  useEffect(() => {
    if (tokenResponse?.token && tokenResponse.livekitUrl) {
      onJoin({
        token: tokenResponse.token,
        livekitUrl: tokenResponse.livekitUrl,
        choices: {
          audioEnabled: true,
          videoEnabled: true,
          username: '',
          audioDeviceId: '',
          videoDeviceId: '',
        },
      });
    }
  }, [tokenResponse, onJoin]);

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
