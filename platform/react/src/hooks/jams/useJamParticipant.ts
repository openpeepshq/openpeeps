import { useCallback, useEffect, useRef } from 'react';
import type { Participant } from 'livekit-client';
import type { SseError } from '@openpeepshq/fetch-client';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useJamContext } from '../../components/jams/JamContext';
import type { JamJoinParams } from './useJamRoom';

export type UseJamParticipantMuteArgs = {
  participant: Participant;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export type UseJamParticipantRemoveArgs = {
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

/** Moderator action: evict a remote participant from the jam room. */
export const useJamParticipantRemove = ({
  participant,
  onSuccess,
  onError,
}: UseJamParticipantRemoveArgs) => {
  const t = useT();
  const { jamPost, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const removeParticipant = openpeepsApi.removeJamParticipantAction({
    id: jamPost.id,
  });

  return async () => {
    try {
      await removeParticipant(
        { identity: participant.identity },
        undefined,
        occurrence ? { occurrence } : undefined,
      );
      onSuccess(
        t('jams.participants.removeSuccess', {
          defaultValue: 'Participant removed from the jam',
        }),
      );
    } catch {
      onError(
        t('jams.participants.removeError', {
          defaultValue: 'Failed to remove participant',
        }),
      );
    }
  };
};

/** Joins once a moderator admits us, or reports a rejection. */
export const useJoinWaitingRoomToken = (
  onJoin: (params: JamJoinParams) => void,
  onError?: (error: SseError | undefined) => void,
  onDenied?: () => void,
) => {
  const { jamPost, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();

  // The stream is (re)created whenever its options change identity, so
  // `onError` must be referentially stable across renders. Callers pass an
  // inline callback, so route it through a ref and hand the stream one
  // callback that never changes identity — otherwise the waiting-room
  // connection would be torn down and re-opened on every render.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const stableOnError = useCallback(
    (error?: SseError) => onErrorRef.current?.(error),
    [],
  );
  const tokenResponse = openpeepsApi.useJoinWaitingRoomStream(
    jamPost.id,
    occurrence,
    stableOnError,
  );

  useEffect(() => {
    if (!tokenResponse) return;
    if ('denied' in tokenResponse) {
      onDenied?.();
      return;
    }
    if (tokenResponse.token && tokenResponse.livekitUrl) {
      // A re-render can hand onJoin a new identity and re-fire this effect;
      // that only re-delivers the already-fresh token, which is a no-op.
      onJoin({
        token: tokenResponse.token,
        livekitUrl: tokenResponse.livekitUrl,
        choices: { audioEnabled: true, videoEnabled: true },
      });
    }
  }, [tokenResponse, onJoin, onDenied]);
};
