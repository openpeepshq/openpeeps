import {
  type TrackReferenceOrPlaceholder,
  TrackRefContext,
  VideoTrack,
  isTrackReference,
  useIsSpeaking,
  useRoomContext,
} from '@livekit/components-react';
import { AudioLines, Ellipsis, Hand, Mic, MicOff } from 'lucide-react';
import { PopupMenu, PopupMenuButton } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useToast } from '../layout/ToastProvider';
import { Avatar } from '../profile';
import { JamAnimatedEmoji } from './JamAnimatedEmoji';
import { useJamContext } from './JamContext';
import { useJamEventsContext } from './JamEventsContext';
import { parseParticipantMetadata } from './jamEventActions';
import { useRaisedHands } from './useJamHands';

export interface JamCallParticipantProps {
  /** Camera track reference (or placeholder when the camera is off). */
  trackRef: TrackReferenceOrPlaceholder;
  /** Tailwind size classes for the tile (e.g. `size-full`, `size-40 md:size-52`). */
  size: string;
  compact?: boolean;
}

function JamParticipantReactions({
  identity,
  isLocal,
}: {
  identity: string;
  isLocal: boolean;
}) {
  const { ownReactions, reactionsForParticipant } = useJamEventsContext();
  const reactions = isLocal ? ownReactions : reactionsForParticipant(identity);
  return (
    <>
      {reactions.map((reaction) => (
        <JamAnimatedEmoji key={reaction.id} emoji={reaction.content ?? ''} />
      ))}
    </>
  );
}

/** Moderator-only menu to mute a remote participant. Mirrors the Svelte
 * `CallParticipant` mute control and the React Native action sheet. */
function JamParticipantModeratorMenu({
  trackRef,
}: {
  trackRef: TrackReferenceOrPlaceholder;
}) {
  const t = useT();
  const { jamPost } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const { success, error } = useToast();
  const muteParticipant = openpeepsApi.muteJamParticipantAction({
    id: jamPost.id,
  });
  const participant = trackRef.participant;

  const handleMute = async () => {
    const audioPublication = participant
      .getTrackPublications()
      .find((pub) => pub.track?.kind === 'audio');
    if (!audioPublication) return;
    try {
      await muteParticipant({
        identity: participant.identity,
        trackSid: audioPublication.trackSid,
      });
      success(
        t('jams.participants.muteSuccess', {
          defaultValue: 'Participant muted successfully',
        }),
      );
    } catch {
      error(
        t('jams.participants.muteError', {
          defaultValue: 'Failed to mute participant',
        }),
      );
    }
  };

  return (
    <PopupMenu
      icon={Ellipsis}
      className="bg-surface-100 text-foreground"
      iconSize={16}
      title={t('jams.participants.title', { defaultValue: 'Participants' })}
    >
      <PopupMenuButton
        title={t('jams.participants.muteParticipant', {
          defaultValue: 'Mute Participant',
        })}
        text={t('jams.participants.muteParticipant', {
          defaultValue: 'Mute Participant',
        })}
        icon={MicOff}
        action={handleMute}
      />
    </PopupMenu>
  );
}

/** Overlay mirroring the Svelte `ParticipantOverlay`: raised hand + mic state
 * indicators on top, name (with moderator `*` prefix) at the bottom. */
function JamParticipantOverlay({
  trackRef,
  compact,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  compact: boolean;
}) {
  const participant = trackRef.participant;
  const room = useRoomContext();
  const me = useCurrentProfile();
  const { jam } = useJamContext();
  const raisedHands = useRaisedHands(room);
  const speaking = useIsSpeaking(participant);

  const micOn = participant.isMicrophoneEnabled;
  const handUp = raisedHands.has(participant.identity);
  const profile = parseParticipantMetadata(participant.metadata).profile;
  const isModerator = jam.moderators.includes(participant.identity);
  const viewerIsModerator = !!me && jam.moderators.includes(me.id);

  const iconSize = compact ? 'size-3' : 'size-3 md:size-4';

  return (
    <div
      className={`absolute right-0 top-0 flex h-full w-full flex-col justify-between ${compact ? '' : 'md:p-3'}`}
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex items-center gap-1">
          {handUp ? (
            <div className="bg-surface-50/70 rounded-full p-2">
              <Hand className={iconSize} />
            </div>
          ) : null}
          {viewerIsModerator && !participant.isLocal ? (
            <JamParticipantModeratorMenu trackRef={trackRef} />
          ) : null}
        </div>
        <div
          className={`bg-surface-100 text-foreground rounded-full p-2 ${micOn && speaking ? 'text-primary-500' : ''}`}
        >
          {!micOn ? (
            <MicOff className={iconSize} />
          ) : speaking ? (
            <AudioLines className={iconSize} />
          ) : (
            <Mic className={iconSize} />
          )}
        </div>
      </div>
      <div className="flex w-full items-end justify-between">
        <div
          className={`bg-surface-100 text-foreground block max-w-full truncate rounded-lg p-1 ${compact ? 'text-xs' : 'text-sm'}`}
        >
          {profile
            ? (isModerator ? '* ' : '') +
              (profile.displayName || `@${profile.handle}`)
            : ''}
        </div>
      </div>
    </div>
  );
}

/**
 * Single participant tile mirroring the Svelte `CallParticipant`: the camera
 * video (or an avatar fallback when the camera is off/muted), the participant
 * overlay and any active reactions. Audio playback is handled globally by
 * `RoomAudioRenderer`, so no per-tile audio element is needed.
 */
export function JamCallParticipant({
  trackRef,
  size,
  compact = false,
}: JamCallParticipantProps) {
  const participant = trackRef.participant;
  const profile = parseParticipantMetadata(participant.metadata).profile;

  return (
    <div className={`${size} bg-surface-50 relative rounded-xl border`}>
      <TrackRefContext.Provider value={trackRef}>
        <div className="size-full overflow-hidden rounded-xl">
          {isTrackReference(trackRef) && !trackRef.publication.isMuted ? (
            <VideoTrack
              trackRef={trackRef}
              className="size-full object-cover"
            />
          ) : (
            <div className="relative flex size-full items-center justify-center">
              <Avatar profile={profile} size={5} borderless />
            </div>
          )}
        </div>
        <JamParticipantOverlay trackRef={trackRef} compact={compact} />
        <JamParticipantReactions
          identity={participant.identity}
          isLocal={participant.isLocal}
        />
      </TrackRefContext.Provider>
    </div>
  );
}
