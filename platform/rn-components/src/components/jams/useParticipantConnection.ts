import { useEffect, useState } from 'react';
import {
  ConnectionQuality,
  ParticipantEvent,
  type Participant,
} from 'livekit-client';

/**
 * True while LiveKit reports the participant's connection as lost. Mirrors the
 * web `useConnectionLost`, which relies on `@livekit/components-react`.
 */
export const useConnectionLost = (participant: Participant) => {
  const [lost, setLost] = useState(
    participant.connectionQuality === ConnectionQuality.Lost
  );

  useEffect(() => {
    const update = (quality: ConnectionQuality) =>
      setLost(quality === ConnectionQuality.Lost);
    update(participant.connectionQuality);
    participant.on(ParticipantEvent.ConnectionQualityChanged, update);
    return () => {
      participant.off(ParticipantEvent.ConnectionQualityChanged, update);
    };
  }, [participant]);

  return lost;
};

/** Current connection quality of a participant, kept in sync with LiveKit. */
export const useConnectionQuality = (participant: Participant) => {
  const [quality, setQuality] = useState(participant.connectionQuality);

  useEffect(() => {
    setQuality(participant.connectionQuality);
    participant.on(ParticipantEvent.ConnectionQualityChanged, setQuality);
    return () => {
      participant.off(ParticipantEvent.ConnectionQualityChanged, setQuality);
    };
  }, [participant]);

  return quality;
};
