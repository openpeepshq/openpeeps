import { useEffect, useState } from 'react';
import { type Room, RoomEvent } from 'livekit-client';
import { parseParticipantMetadata } from './jamEventActions';

const computeRaisedHands = (room: Room): Set<string> => {
  const raised = new Set<string>();
  const participants = [
    room.localParticipant,
    ...room.remoteParticipants.values(),
  ];
  for (const participant of participants) {
    if (parseParticipantMetadata(participant.metadata).handRaised) {
      raised.add(participant.identity);
    }
  }
  return raised;
};

/**
 * Set of participant identities currently raising their hand, kept in sync with
 * `ParticipantMetadataChanged` / connect / disconnect room events. Mirrors the
 * Svelte `participantHandRaisedStore`.
 */
export function useRaisedHands(room: Room): Set<string> {
  const [hands, setHands] = useState<Set<string>>(() =>
    computeRaisedHands(room),
  );

  useEffect(() => {
    const update = () => setHands(computeRaisedHands(room));
    update();
    room
      .on(RoomEvent.ParticipantMetadataChanged, update)
      .on(RoomEvent.ParticipantConnected, update)
      .on(RoomEvent.ParticipantDisconnected, update);
    return () => {
      room
        .off(RoomEvent.ParticipantMetadataChanged, update)
        .off(RoomEvent.ParticipantConnected, update)
        .off(RoomEvent.ParticipantDisconnected, update);
    };
  }, [room]);

  return hands;
}
