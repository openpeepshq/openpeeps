import { useEffect, useRef, useState } from 'react';
import type { Participant, Room } from 'livekit-client';
import {
  enlargedIdentity,
  type LocalSpeakerFocus,
} from '../../components/jams/speakerLayout';
import { useJamSpotlight } from '../../components/jams/useJamSpotlight';

export type UseJamStageArgs = {
  room: Room;
  participants: Participant[];
  /** Someone is presenting; leaving that state drops the grid override. */
  screenSharing: boolean;
};

/**
 * Who fills the stage and whether the attendee overrode a presentation with
 * the grid. A host spotlight is followed until the attendee pins someone or
 * picks the grid; a pin whose participant left falls back to the grid.
 */
export const useJamStage = ({
  room,
  participants,
  screenSharing,
}: UseJamStageArgs) => {
  const { spotlightIdentity, setSpotlight, canSpotlight } = useJamSpotlight({
    room,
    participants,
  });
  const [focus, setFocus] = useState<LocalSpeakerFocus>({ mode: 'follow' });
  const seenSpotlight = useRef(spotlightIdentity);

  useEffect(() => {
    if (seenSpotlight.current === spotlightIdentity) return;
    seenSpotlight.current = spotlightIdentity;
    setFocus({ mode: 'follow' });
  }, [spotlightIdentity]);

  const presentIds = new Set(
    participants.map((participant) => participant.identity),
  );
  const stageIdentity = enlargedIdentity(focus, spotlightIdentity, presentIds);

  useEffect(() => {
    if (focus.mode !== 'pin') return;
    const stillThere = participants.some(
      (participant) => participant.identity === focus.identity,
    );
    if (stillThere) return;
    setFocus({ mode: 'grid' });
  }, [participants, focus]);

  const [showGridView, setShowGridView] = useState(false);
  useEffect(() => {
    if (!screenSharing) setShowGridView(false);
  }, [screenSharing]);

  return {
    stageIdentity,
    spotlightIdentity,
    enlarge: (identity: string) => setFocus({ mode: 'pin', identity }),
    showGrid: () => setFocus({ mode: 'grid' }),
    toggleSpotlight: canSpotlight
      ? (identity: string | null) => setSpotlight(identity)
      : undefined,
    showGridView,
    setShowGridView,
  };
};
