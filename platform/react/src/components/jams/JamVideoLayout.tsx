import { useEffect, useRef, useState } from 'react';
import {
  type TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { LayoutGrid, Maximize2, Pin, PinOff, ScreenShare } from 'lucide-react';
import { profileName, sortByRaisedHand } from '@openpeepshq/common/lib';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { AvatarWithName } from '../profile';
import { JamCallParticipant } from './JamCallParticipant';
import { parseParticipantMetadata } from './jamEventActions';
import { enlargedIdentity, type LocalSpeakerFocus } from './speakerLayout';
import { useJamSpotlight } from './useJamSpotlight';

export interface JamVideoLayoutProps {
  /** One camera track reference (or placeholder) per participant. */
  cameraTracks: TrackReferenceOrPlaceholder[];
  /** Active screen-share track references. */
  screenShareTracks: TrackReferenceOrPlaceholder[];
  observer: boolean;
}

const cameraPublishing = (track: TrackReferenceOrPlaceholder) =>
  isTrackReference(track) && !track.publication.isMuted;

/** Responsive grid for 1 (observer) or 3+ participants (Svelte `Default`). */
function DefaultGrid({
  cameraTracks,
  spotlightIdentity,
  onEnlarge,
  onToggleSpotlight,
}: {
  cameraTracks: TrackReferenceOrPlaceholder[];
  spotlightIdentity: string | null;
  onEnlarge: (identity: string) => void;
  onToggleSpotlight?: (identity: string | null) => void;
}) {
  return (
    <div className="grid h-full min-h-0 w-full auto-rows-min grid-cols-2 content-start justify-items-center gap-2 overflow-y-auto overscroll-y-contain p-2 md:mb-32 md:flex md:flex-grow md:flex-wrap md:items-center md:justify-center md:content-[safe_center]">
      {cameraTracks.map((track) => {
        const identity = track.participant.identity;
        const spotlighted = identity === spotlightIdentity;
        return (
          <JamCallParticipant
            key={identity}
            trackRef={track}
            size="size-40 md:size-52"
            onEnlarge={
              cameraPublishing(track) ? () => onEnlarge(identity) : undefined
            }
            spotlighted={spotlighted}
            onToggleSpotlight={
              onToggleSpotlight
                ? () => onToggleSpotlight(spotlighted ? null : identity)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

/** Single local participant filling the view (Svelte `Alone`). */
function AloneLayout({ track }: { track: TrackReferenceOrPlaceholder }) {
  return (
    <div className="size-full p-2">
      <JamCallParticipant trackRef={track} size="size-full" />
    </div>
  );
}

/** Remote full-screen with the local participant as a picture-in-picture tile
 * (Svelte `OneOnOne`). */
function OneOnOneLayout({
  local,
  remote,
}: {
  local: TrackReferenceOrPlaceholder;
  remote: TrackReferenceOrPlaceholder;
}) {
  return (
    <div className="relative size-full p-2">
      <JamCallParticipant trackRef={remote} size="size-full" />
      <div className="absolute bottom-4 right-4 size-32 md:size-56">
        <JamCallParticipant trackRef={local} size="size-full" />
      </div>
    </div>
  );
}

/** Presented screen plus a strip of participant tiles (Svelte `ScreenSharing`). */
function ScreenSharingLayout({
  cameraTracks,
  screenShareTrack,
  spotlightIdentity,
  onToggleSpotlight,
}: {
  cameraTracks: TrackReferenceOrPlaceholder[];
  screenShareTrack: TrackReferenceOrPlaceholder;
  spotlightIdentity: string | null;
  onToggleSpotlight?: (identity: string | null) => void;
}) {
  const t = useT();
  const room = useRoomContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const participant = screenShareTrack.participant;
  const profile = parseParticipantMetadata(participant.metadata).profile;
  const isLocal = participant.isLocal;

  const canFullscreen =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function' &&
    document.fullscreenEnabled;

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el || !canFullscreen) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen().catch(() => undefined);
    }
  };

  const participantStripClass = [
    'flex w-full min-h-0 flex-row flex-wrap content-start',
    'justify-center gap-1 overflow-y-auto overscroll-y-contain',
    'max-md:portrait:max-h-40 max-md:portrait:shrink',
    'max-md:landscape:h-full max-md:landscape:w-28',
    'max-md:landscape:flex-col max-md:landscape:flex-nowrap',
    'max-md:landscape:justify-start',
    'md:my-4 md:h-full',
    cameraTracks.length > 7 ? 'md:w-56' : 'md:w-28',
  ].join(' ');

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden md:flex-row max-md:landscape:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <div className="flex w-full flex-shrink-0 items-center justify-between">
          {isLocal ? (
            <>
              <div className="flex items-center gap-x-2">
                <ScreenShare className="size-5" />
                {profileName(profile)} {t('jams.screenShare.youPresenting')}
              </div>
              <Button
                variant="outline"
                title={t('jams.screenShare.stopTitle')}
                action={() =>
                  void room.localParticipant
                    .setScreenShareEnabled(false)
                    .catch(() => undefined)
                }
              >
                {t('jams.screenShare.stopSharing')}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-x-2 py-1 landscape:py-0">
              <AvatarWithName profile={profile} />
              {t('jams.screenShare.presenting')}
            </div>
          )}
        </div>
        <div
          ref={containerRef}
          className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-xl border"
        >
          {isTrackReference(screenShareTrack) ? (
            <>
              <VideoTrack
                trackRef={screenShareTrack}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
              {canFullscreen ? (
                <button
                  type="button"
                  title={t('jams.screenShare.startStopTitle')}
                  aria-label={t('jams.screenShare.startStopTitle')}
                  className="bg-foreground/60 text-on-primary-token hover:bg-foreground/80 absolute bottom-3 right-3 rounded-full p-2 transition-colors"
                  onClick={toggleFullscreen}
                >
                  <Maximize2 className="size-5" aria-hidden="true" />
                  <span className="sr-only">
                    {t('jams.screenShare.startStopTitle')}
                  </span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <div className={participantStripClass}>
        {cameraTracks.map((track) => {
          const identity = track.participant.identity;
          const spotlighted = identity === spotlightIdentity;
          return (
            <JamCallParticipant
              key={identity}
              trackRef={track}
              size="size-24 flex-shrink-0"
              compact
              spotlighted={spotlighted}
              onToggleSpotlight={
                onToggleSpotlight
                  ? () => onToggleSpotlight(spotlighted ? null : identity)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/** Large stage plus a filmstrip of everyone else. */
function SpeakerLayout({
  stage,
  cameraTracks,
  spotlightIdentity,
  onEnlarge,
  onShowGrid,
  onToggleSpotlight,
}: {
  stage: TrackReferenceOrPlaceholder;
  cameraTracks: TrackReferenceOrPlaceholder[];
  spotlightIdentity: string | null;
  onEnlarge: (identity: string) => void;
  onShowGrid: () => void;
  onToggleSpotlight?: (identity: string | null) => void;
}) {
  const t = useT();
  const stageIdentity = stage.participant.identity;
  const spotlighted = stageIdentity === spotlightIdentity;
  const spotlightLabel = spotlighted
    ? t('jams.speakerView.removeSpotlight')
    : t('jams.speakerView.spotlight');
  const others = cameraTracks.filter(
    (track) => track.participant.identity !== stageIdentity,
  );
  const stageIconButtonClass =
    'bg-surface text-foreground border-border flex size-10 shrink-0 items-center justify-center rounded-full border';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden p-2 md:flex-row max-md:landscape:flex-row">
      <div className="relative min-h-0 min-w-0 flex-1">
        <JamCallParticipant
          trackRef={stage}
          size="size-full"
          spotlighted={spotlighted}
          onToggleSpotlight={
            onToggleSpotlight
              ? () => onToggleSpotlight(spotlighted ? null : stageIdentity)
              : undefined
          }
        />
        {cameraPublishing(stage) ? null : (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex justify-center px-4">
            <p className="bg-surface text-foreground rounded-lg px-3 py-2 text-sm">
              {t('jams.speakerView.cameraOff')}
            </p>
          </div>
        )}
        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
          <button
            type="button"
            className={stageIconButtonClass}
            title={t('jams.speakerView.showGrid')}
            aria-label={t('jams.speakerView.showGrid')}
            onClick={onShowGrid}
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
          </button>
          {onToggleSpotlight ? (
            <button
              type="button"
              className={stageIconButtonClass}
              title={spotlightLabel}
              aria-label={spotlightLabel}
              onClick={() =>
                onToggleSpotlight(spotlighted ? null : stageIdentity)
              }
            >
              {spotlighted ? (
                <PinOff className="size-4" aria-hidden="true" />
              ) : (
                <Pin className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
          {spotlighted ? (
            <span
              role="img"
              title={t('jams.speakerView.spotlighted')}
              aria-label={t('jams.speakerView.spotlighted')}
              className="bg-primary text-on-primary-token flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <Pin className="size-4" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex max-h-32 min-h-0 w-full flex-shrink-0 flex-row gap-2 overflow-x-auto overscroll-x-contain md:h-full md:max-h-full md:w-36 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:overscroll-y-contain max-md:landscape:h-full max-md:landscape:max-h-full max-md:landscape:w-28 max-md:landscape:flex-col max-md:landscape:overflow-y-auto max-md:landscape:overflow-x-hidden">
        {others.map((track) => {
          const identity = track.participant.identity;
          const tileSpotlighted = identity === spotlightIdentity;
          return (
            <JamCallParticipant
              key={identity}
              trackRef={track}
              size="size-24 flex-shrink-0"
              compact
              spotlighted={tileSpotlighted}
              onEnlarge={
                cameraPublishing(track) ? () => onEnlarge(identity) : undefined
              }
              onToggleSpotlight={
                onToggleSpotlight
                  ? () => onToggleSpotlight(tileSpotlighted ? null : identity)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Picks the in-call layout. Screen sharing stays in front. A personal pin or
 * host spotlight then fills the stage. Otherwise: alone, one-on-one, or grid.
 */
export function JamVideoLayout({
  cameraTracks,
  screenShareTracks,
  observer,
}: JamVideoLayoutProps) {
  const participants = useParticipants();
  const { spotlightIdentity, setSpotlight, canSpotlight } = useJamSpotlight();
  const [focus, setFocus] = useState<LocalSpeakerFocus>({ mode: 'follow' });
  const seenSpotlight = useRef(spotlightIdentity);
  const orderedCameraTracks = sortByRaisedHand(
    cameraTracks,
    (track) => track.participant.metadata,
  );

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

  const onEnlarge = (identity: string) => setFocus({ mode: 'pin', identity });
  const onToggleSpotlight = canSpotlight
    ? (identity: string | null) => setSpotlight(identity)
    : undefined;

  const [screenShareTrack] = screenShareTracks;
  if (screenShareTrack) {
    return (
      <ScreenSharingLayout
        cameraTracks={orderedCameraTracks}
        screenShareTrack={screenShareTrack}
        spotlightIdentity={spotlightIdentity}
        onToggleSpotlight={onToggleSpotlight}
      />
    );
  }

  const stage = orderedCameraTracks.find(
    (track) => track.participant.identity === stageIdentity,
  );
  if (stage) {
    return (
      <SpeakerLayout
        stage={stage}
        cameraTracks={orderedCameraTracks}
        spotlightIdentity={spotlightIdentity}
        onEnlarge={onEnlarge}
        onShowGrid={() => setFocus({ mode: 'grid' })}
        onToggleSpotlight={onToggleSpotlight}
      />
    );
  }

  const [firstTrack] = orderedCameraTracks;
  if (!observer && orderedCameraTracks.length === 1 && firstTrack) {
    return <AloneLayout track={firstTrack} />;
  }

  if (!observer && orderedCameraTracks.length === 2) {
    const local = orderedCameraTracks.find(
      (track) => track.participant.isLocal,
    );
    const remote = orderedCameraTracks.find(
      (track) => !track.participant.isLocal,
    );
    if (local && remote) {
      return <OneOnOneLayout local={local} remote={remote} />;
    }
  }

  return (
    <DefaultGrid
      cameraTracks={orderedCameraTracks}
      spotlightIdentity={spotlightIdentity}
      onEnlarge={onEnlarge}
      onToggleSpotlight={onToggleSpotlight}
    />
  );
}
