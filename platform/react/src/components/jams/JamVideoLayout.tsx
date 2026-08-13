import { useRef } from 'react';
import {
  type TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
  useRoomContext,
} from '@livekit/components-react';
import { Maximize2, ScreenShare } from 'lucide-react';
import { profileName } from '@openpeepshq/common/lib';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { AvatarWithName } from '../profile';
import { JamCallParticipant } from './JamCallParticipant';
import { parseParticipantMetadata } from './jamEventActions';

export interface JamVideoLayoutProps {
  /** One camera track reference (or placeholder) per participant. */
  cameraTracks: TrackReferenceOrPlaceholder[];
  /** Active screen-share track references. */
  screenShareTracks: TrackReferenceOrPlaceholder[];
  observer: boolean;
}

/** Responsive grid for 1 (observer) or 3+ participants (Svelte `Default`). */
function DefaultGrid({
  cameraTracks,
}: {
  cameraTracks: TrackReferenceOrPlaceholder[];
}) {
  return (
    <div className="grid h-full w-full auto-rows-min grid-cols-2 place-items-center content-start justify-items-center gap-2 overflow-auto p-2 md:mb-32 md:flex md:flex-grow md:flex-wrap md:content-center md:items-center md:justify-center">
      {cameraTracks.map((track) => (
        <JamCallParticipant
          key={track.participant.identity}
          trackRef={track}
          size="size-40 md:size-52"
        />
      ))}
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
}: {
  cameraTracks: TrackReferenceOrPlaceholder[];
  screenShareTrack: TrackReferenceOrPlaceholder;
}) {
  const t = useT();
  const room = useRoomContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const participant = screenShareTrack.participant;
  const profile = parseParticipantMetadata(participant.metadata).profile;
  const isLocal = participant.isLocal;

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen().catch(() => undefined);
    }
  };

  const participantStripClass = [
    'flex w-full flex-shrink-0 flex-row flex-wrap content-start',
    'justify-center gap-1 overflow-y-auto',
    'max-md:landscape:h-full max-md:landscape:w-28',
    'max-md:landscape:flex-col max-md:landscape:flex-nowrap',
    'md:my-4 md:h-full',
    cameraTracks.length > 7 ? 'md:w-56' : 'md:w-28',
  ].join(' ');

  // Phone landscape is still below `md`; a side strip keeps the share on-screen.
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 md:flex-row max-md:landscape:flex-row">
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
              <button
                type="button"
                title={t('jams.screenShare.startStopTitle')}
                className="bg-foreground/60 text-on-primary-token hover:bg-foreground/80 absolute bottom-3 right-3 rounded-full p-2 transition-colors"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className={participantStripClass}>
        {cameraTracks.map((track) => (
          <JamCallParticipant
            key={track.participant.identity}
            trackRef={track}
            size="size-24 flex-shrink-0"
            compact
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Picks the in-call layout to match the Svelte `VideoCall` mode selection:
 * screen-sharing > observer/default grid > alone (1) > one-on-one (2) > grid.
 */
export function JamVideoLayout({
  cameraTracks,
  screenShareTracks,
  observer,
}: JamVideoLayoutProps) {
  const [screenShareTrack] = screenShareTracks;
  if (screenShareTrack) {
    return (
      <ScreenSharingLayout
        cameraTracks={cameraTracks}
        screenShareTrack={screenShareTrack}
      />
    );
  }

  const [firstTrack] = cameraTracks;
  if (!observer && cameraTracks.length === 1 && firstTrack) {
    return <AloneLayout track={firstTrack} />;
  }

  if (!observer && cameraTracks.length === 2) {
    const local = cameraTracks.find((track) => track.participant.isLocal);
    const remote = cameraTracks.find((track) => !track.participant.isLocal);
    if (local && remote) {
      return <OneOnOneLayout local={local} remote={remote} />;
    }
  }

  return <DefaultGrid cameraTracks={cameraTracks} />;
}
