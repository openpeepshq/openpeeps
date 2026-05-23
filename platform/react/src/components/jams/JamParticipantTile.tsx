import {
  ParticipantTile,
  useMaybeTrackRefContext,
} from '@livekit/components-react';
import { JamAnimatedEmoji } from './JamAnimatedEmoji';
import { useJamEventsContext } from './JamEventsContext';

function JamTileReactions() {
  const trackRef = useMaybeTrackRefContext();
  const { ownReactions, reactionsForParticipant } = useJamEventsContext();
  const participantId = trackRef?.participant.identity;
  const isLocal = trackRef?.participant.isLocal;

  if (!participantId) {
    return null;
  }

  const reactions = isLocal
    ? ownReactions
    : reactionsForParticipant(participantId);

  return (
    <>
      {reactions.map((reaction) => (
        <JamAnimatedEmoji key={reaction.id} emoji={reaction.content ?? ''} />
      ))}
    </>
  );
}

export function JamParticipantTile() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <ParticipantTile />
      <JamTileReactions />
    </div>
  );
}
