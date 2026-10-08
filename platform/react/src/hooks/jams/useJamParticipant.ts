import { useEffect } from 'react';
import type { Participant } from 'livekit-client';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useJamContext } from '../../components/jams/JamContext';
import type { JamJoinParams } from './useJamRoom';

export type UseJamParticipantMuteArgs = {
  participant: Participant;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

/** Moderator action: server-side mute of a remote participant's microphone. */
export const useJamParticipantMute = ({
  participant,
  onSuccess,
  onError,
}: UseJamParticipantMuteArgs) => {
  const t = useT();
  const { jamPost } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const muteParticipant = openpeepsApi.muteJamParticipantAction({
    id: jamPost.id,
  });

  return async () => {
    const audioPublication = participant
      .getTrackPublications()
      .find((pub) => pub.track?.kind === 'audio');
    if (!audioPublication) return;
    try {
      await muteParticipant({
        identity: participant.identity,
        trackSid: audioPublication.trackSid,
      });
      onSuccess(
        t('jams.participants.muteSuccess', {
          defaultValue: 'Participant muted successfully',
        }),
      );
    } catch {
      onError(
        t('jams.participants.muteError', {
          defaultValue: 'Failed to mute participant',
        }),
      );
    }
  };
};

/** Joins automatically once a moderator admits us from the waiting room. */
export const useJoinWaitingRoomToken = (
  onJoin: (params: JamJoinParams) => void,
) => {
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
        choices: { audioEnabled: true, videoEnabled: true },
      });
    }
  }, [tokenResponse, onJoin]);
};
