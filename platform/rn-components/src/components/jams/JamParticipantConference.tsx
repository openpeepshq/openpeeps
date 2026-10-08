import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  AudioSession,
  isTrackReference,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { truncateText } from '@openpeepshq/common';
import {
  JamEventsProvider,
  useJamContext,
  useJamLocalSettings,
} from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { JamChatDrawer } from './JamChatDrawer';
import { JamDetailsDrawer } from './JamDetailsDrawer';
import { JamFooter } from './JamFooter';
import { JamPeopleDrawer } from './JamPeopleDrawer';
import { JamNetworkQuality, JamRecordingIndicator } from './JamRoomIndicators';
import { JamVideoLayout } from './JamVideoLayout';

type Drawer = 'chat' | 'people' | 'details' | null;

const JamParticipantConferenceInner = () => {
  const room = useRoomContext();
  const { jamEvent } = useJamContext();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [settings, updateSettings] = useJamLocalSettings();
  const remoteParticipants = useRemoteParticipants();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const cameraTracks = tracks.filter(
    (track) => track.source === Track.Source.Camera
  );
  const screenShareTracks = tracks.filter(
    (track) =>
      isTrackReference(track) &&
      track.publication.source === Track.Source.ScreenShare &&
      !track.publication.isMuted
  );

  // Apply the speaker chosen in the lobby once we are in the room.
  useEffect(() => {
    if (!settings.speakerDeviceId) return;
    void AudioSession.selectAudioOutput(settings.speakerDeviceId).catch(
      () => undefined
    );
    // Only re-apply when the room changes, not on every settings update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // There are no <audio> elements on native: the speaker toggle silences every
  // remote participant instead (including ones joining later).
  useEffect(() => {
    remoteParticipants.forEach((participant) =>
      participant.setVolume(settings.speakerEnabled ? 1 : 0)
    );
  }, [remoteParticipants, settings.speakerEnabled]);

  const toggleDrawer = (next: Exclude<Drawer, null>) =>
    setDrawer((current) => (current === next ? null : next));

  return (
    <View className="relative flex-1 overflow-hidden bg-background">
      <JamNetworkQuality />
      <JamRecordingIndicator />
      <View className="relative min-h-0 w-full flex-1 overflow-hidden p-2">
        <View className="min-h-0 flex-1 overflow-hidden">
          <View className="shrink-0 flex-row items-center">
            <ThemedText className="font-semibold">
              {truncateText(jamEvent.name, 40)}
            </ThemedText>
          </View>
          <View className="min-h-0 flex-1">
            <JamVideoLayout
              cameraTracks={cameraTracks}
              screenShareTracks={screenShareTracks}
              observer={false}
            />
          </View>
        </View>
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
      </View>
      <View className="w-full shrink-0 bg-background">
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
        />
      </View>
    </View>
  );
};

/**
 * In-call participant UI: a full-screen column with network/recording
 * indicators, a mode-based participant layout (alone / one-on-one / grid /
 * screen-sharing), drawers (chat, people, details) rendered as overlays like
 * the web mobile layout, and the footer toolbar.
 */
export const JamParticipantConference = () => {
  const room = useRoomContext();
  return (
    <JamEventsProvider room={room}>
      <JamParticipantConferenceInner />
    </JamEventsProvider>
  );
};
