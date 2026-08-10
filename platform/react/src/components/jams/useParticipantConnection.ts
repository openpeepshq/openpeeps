import { useConnectionQualityIndicator } from '@livekit/components-react';
import type { Participant } from 'livekit-client';
import { ConnectionQuality } from 'livekit-client';

/**
 * True while the SFU reports a participant as unreachable. LiveKit flags this
 * well before `ParticipantDisconnected` fires, so idle mobile devices (whose OS
 * suspends the media pipeline) stop looking active to everyone else.
 */
export const useConnectionLost = (participant: Participant): boolean => {
  const { quality } = useConnectionQualityIndicator({ participant });
  return quality === ConnectionQuality.Lost;
};
