import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { VideoView, useRoomContext } from '@livekit/react-native';
import { createLocalVideoTrack, type LocalVideoTrack } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import {
  type JamJoinParams,
  useJamLobby,
  useJamLocalSettings,
  useRouter,
} from '@openpeepshq/react';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from '../icons/index';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';
import {
  DeviceSelectorPill,
  useAudioOutputs,
  useCameraDevices,
} from './JamDeviceSelectors';
import { JamGuestForm } from './JamGuestForm';

export interface JamLobbyProps {
  /** Called once the user has picked devices and the join token has been obtained. */
  onJoin: (params: JamJoinParams) => void;
}

/** Camera preview track for the lobby; released when disabled or unmounted. */
const usePreviewTrack = (
  enabled: boolean,
  deviceId: string,
  onError: (message: string) => void
) => {
  const [track, setTrack] = useState<LocalVideoTrack>();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let created: LocalVideoTrack | undefined;
    createLocalVideoTrack(deviceId ? { deviceId } : undefined)
      .then((videoTrack) => {
        if (cancelled) {
          videoTrack.stop();
          return;
        }
        created = videoTrack;
        setTrack(videoTrack);
      })
      .catch((err: Error) => onError(err.message));
    return () => {
      cancelled = true;
      created?.stop();
      setTrack(undefined);
    };
  }, [enabled, deviceId, onError]);

  return track;
};

/**
 * Pre-room screen. Guests without a jam-scoped pass see {@link JamGuestForm};
 * authenticated users get a device-selection card: a centered card with a
 * square camera preview, mic/speaker/camera controls, and a join button.
 * Background blur is web-only (no track processor on React Native).
 */
export const JamLobby = ({ onJoin }: JamLobbyProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    username,
    jamEvent,
    jamActive,
    canAccess,
    error,
    setError,
    submitting,
    join,
  } = useJamLobby({ onJoin });

  const [settings, updateSettings] = useJamLocalSettings();

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoDeviceId, setVideoDeviceId] = useState('');
  const { devices: videoDevices } = useCameraDevices(useRoomContext());
  const speakerDevices = useAudioOutputs();

  const videoTrack = usePreviewTrack(videoEnabled, videoDeviceId, setError);

  if (!canAccess) {
    return <JamGuestForm />;
  }

  const handleJoin = () =>
    join({
      username,
      audioEnabled,
      videoEnabled,
      audioDeviceId: '',
      videoDeviceId,
    });

  return (
    <View className="w-full flex-1 items-center justify-center p-4">
      <View className="w-full max-w-lg rounded-md border border-border bg-background p-4">
        <View className="flex-row items-center justify-between border-b border-border p-2">
          <ThemedText className="text-lg">
            {t('jams.lobby.readyTitle')}
          </ThemedText>
          <Pressable
            accessibilityLabel={t('jams.exit.title')}
            className="size-8 items-center justify-center rounded-full bg-muted"
            onPress={() => router.navigate({ type: 'jams' })}
          >
            <XIcon size={16} className="text-foreground" />
          </Pressable>
        </View>

        <View className="items-center p-5">
          <ThemedText className="my-1 text-center text-lg">
            {jamEvent.name || t('jams.lobby.fallbackTitle')}
          </ThemedText>

          <View className="relative size-64 overflow-hidden rounded-xl">
            {videoTrack ? (
              <VideoView
                videoTrack={videoTrack}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
                mirror
              />
            ) : (
              <View className="size-64 items-center justify-center rounded-xl bg-card">
                <ThemedText className="text-lg">
                  {t('jams.lobby.cameraOff')}
                </ThemedText>
              </View>
            )}
          </View>

          <View className="mt-4 w-full flex-row items-center justify-center gap-x-4">
            <DeviceSelectorPill
              enabled={audioEnabled}
              onToggle={() => setAudioEnabled((on) => !on)}
              onIcon={MicIcon}
              offIcon={MicOffIcon}
              deviceType="mic"
            />
            <DeviceSelectorPill
              enabled={settings.speakerEnabled}
              onToggle={() =>
                updateSettings({ speakerEnabled: !settings.speakerEnabled })
              }
              onIcon={Volume2Icon}
              offIcon={VolumeXIcon}
              deviceType="speaker"
              devices={speakerDevices}
              activeDeviceId={settings.speakerDeviceId}
              onDeviceChange={(speakerDeviceId) =>
                updateSettings({ speakerDeviceId })
              }
            />
            <DeviceSelectorPill
              enabled={videoEnabled}
              onToggle={() => setVideoEnabled((on) => !on)}
              onIcon={VideoIcon}
              offIcon={VideoOffIcon}
              deviceType="camera"
              devices={videoDevices}
              activeDeviceId={videoDeviceId}
              onDeviceChange={setVideoDeviceId}
            />
          </View>
        </View>

        <View className="w-full items-center px-5 pb-4">
          <Button
            accessibilityLabel={t('jams.join.submit')}
            disabled={submitting}
            onPress={handleJoin}
          >
            <ThemedText className="text-primary-foreground">
              {jamActive ? t('jams.join.ctaJoin') : t('jams.join.ctaStart')}
            </ThemedText>
          </Button>
          {error ? (
            <ThemedText className="mt-3 text-sm text-destructive">
              {error}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </View>
  );
};
