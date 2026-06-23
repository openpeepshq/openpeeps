import { useEffect, useState } from 'react';
import {
  ConnectionStateToast,
  RoomAudioRenderer,
  isTrackReference,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { LocalVideoTrack, Track } from 'livekit-client';
import { truncateText } from '@openpeeps/common';
import { JamChatDrawer } from './JamChatDrawer';
import { JamDetailsDrawer } from './JamDetailsDrawer';
import { useJamContext } from './JamContext';
import { JamEventsProvider } from './JamEventsContext';
import { audioOutputSupported } from './constants';
import { JamFooter } from './JamFooter';
import { JamPeopleDrawer } from './JamPeopleDrawer';
import { JamNetworkQuality, JamRecordingIndicator } from './JamRoomIndicators';
import { JamVideoLayout } from './JamVideoLayout';
import { useJamLocalSettings } from './jamLocalSettings';

type Drawer = 'chat' | 'people' | 'details' | null;

function JamParticipantConferenceInner() {
  const room = useRoomContext();
  const { jamEvent } = useJamContext();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [settings, updateSettings] = useJamLocalSettings();
  const { cameraTrack } = useLocalParticipant();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const cameraTracks = tracks.filter(
    (track) => track.source === Track.Source.Camera,
  );
  const screenShareTracks = tracks.filter(
    (track) =>
      isTrackReference(track) &&
      track.publication.source === Track.Source.ScreenShare &&
      !track.publication.isMuted,
  );

  // Apply the speaker chosen in the lobby once we are in the room.
  useEffect(() => {
    if (!settings.speakerDeviceId || !audioOutputSupported) return;
    void room
      .switchActiveDevice('audiooutput', settings.speakerDeviceId, true)
      .catch(() => undefined);
    // Only re-apply when the room changes, not on every settings update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Mute/unmute remote audio mirroring Svelte's speaker toggle.
  useEffect(() => {
    document.querySelectorAll('audio').forEach((audio) => {
      audio.muted = !settings.speakerEnabled;
      if (settings.speakerEnabled) audio.volume = 1;
    });
  }, [settings.speakerEnabled]);

  // Keep the published camera track's blur processor in sync with the setting,
  // mirroring the Svelte `switchBackground` behaviour.
  useEffect(() => {
    const track = cameraTrack?.track;
    if (!(track instanceof LocalVideoTrack)) return;
    let cancelled = false;
    if (settings.blur) {
      void import('./blurProcessor').then(({ createBlurProcessor }) => {
        if (cancelled) return;
        void track.setProcessor(createBlurProcessor()).catch(() => undefined);
      });
    } else {
      void track.stopProcessor().catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [cameraTrack, settings.blur]);

  const toggleDrawer = (next: Exclude<Drawer, null>) =>
    setDrawer((current) => (current === next ? null : next));

  return (
    <div className="bg-surface-50 relative flex h-screen w-screen flex-col overflow-hidden">
      <JamNetworkQuality />
      <JamRecordingIndicator />
      <div className="relative flex w-full flex-1 overflow-hidden p-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center md:hidden">
            <h1 className="font-semibold" title={jamEvent.name}>
              {truncateText(jamEvent.name, 40)}
            </h1>
          </div>
          <JamVideoLayout
            cameraTracks={cameraTracks}
            screenShareTracks={screenShareTracks}
            observer={false}
          />
        </div>
        <div className="max-h-full overflow-y-auto md:flex-shrink-0">
          <JamChatDrawer
            open={drawer === 'chat'}
            onClose={() => setDrawer(null)}
          />
          <JamPeopleDrawer
            open={drawer === 'people'}
            onClose={() => setDrawer(null)}
          />
          <JamDetailsDrawer
            open={drawer === 'details'}
            onClose={() => setDrawer(null)}
          />
        </div>
      </div>
      <div className="bg-surface-50 w-full flex-shrink-0 md:h-20 md:p-2">
        <JamFooter
          chatOpen={drawer === 'chat'}
          onToggleChat={() => toggleDrawer('chat')}
          peopleOpen={drawer === 'people'}
          onTogglePeople={() => toggleDrawer('people')}
          detailsOpen={drawer === 'details'}
          onToggleDetails={() => toggleDrawer('details')}
          speakerDeviceId={settings.speakerDeviceId}
          speakerEnabled={settings.speakerEnabled}
          onSpeakerChange={(speakerDeviceId) =>
            updateSettings({ speakerDeviceId })
          }
          onToggleSpeaker={() =>
            updateSettings({ speakerEnabled: !settings.speakerEnabled })
          }
          blur={settings.blur}
          onToggleBlur={() => updateSettings({ blur: !settings.blur })}
        />
      </div>
      <ConnectionStateToast />
    </div>
  );
}

/**
 * In-call participant UI mirroring the Svelte `VideoCall`: a full-screen column
 * with network/recording indicators, a mode-based participant layout (alone /
 * one-on-one / grid / screen-sharing), an optional side drawer (chat or people)
 * and the responsive footer toolbar.
 */
export function JamParticipantConference() {
  return (
    <JamEventsProvider>
      <JamParticipantConferenceInner />
      <RoomAudioRenderer />
    </JamEventsProvider>
  );
}
