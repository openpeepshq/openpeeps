import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { VideoView, useRoomContext } from '@livekit/react-native';
import {
  createLocalAudioTrack,
  createLocalVideoTrack,
  type LocalVideoTrack,
} from 'livekit-client';
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
 *
 * When audio is enabled, a transient one-shot probe verifies mic access
 * before the user joins (iOS permission prompt appears here, not mid-join).
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

  const [audioEnabled, setAudioEnabled] = useState(settings.micEnabled);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoDeviceId, setVideoDeviceId] = useState('');
  const { devices: videoDevices } = useCameraDevices(useRoomContext());
  const speakerDevices = useAudioOutputs();

  const videoTrack = usePreviewTrack(videoEnabled, videoDeviceId, setError);

  // Probe mic access when audio is enabled (mount and toggle-on). One alert per
  // visit: a denied probe is remembered so every later probe only clears the
  // stale error message instead of re-popping the alert.
  const probingRef = useRef(false);
  const probeRearmRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const probeMic = useCallback(
    async (enabled: boolean) => {
      if (!enabled || probingRef.current) return;
      probingRef.current = true;
      try {
        const track = await createLocalAudioTrack();
        track.stop();
        setError(undefined);
      } catch (err: unknown) {
        console.warn('[jams:mic] lobby probe failed', err);
        const denied =
          err instanceof Error &&
          (err.name === 'NotAllowedError' ||
            err.name === 'PermissionDeniedError');
        const firstDenial = denied && !permissionDeniedRef.current;
        if (firstDenial) {
          permissionDeniedRef.current = true;
        }
        setError(
          denied ? t('jams.mic.lobbyProbeFailed') : t('jams.mic.enableFailed')
        );
        if (firstDenial) {
          Alert.alert(
            t('jams.mic.permissionTitle'),
            t('jams.mic.permissionMessage'),
            [
              { text: t('common.actions.cancel'), style: 'cancel' },
              {
                text: t('media.permissions.openSettings'),
                onPress: () => void Linking.openSettings(),
              },
            ]
          );
        }
      } finally {
        probingRef.current = false;
        // A toggle-on during this probe re-arms it: run once more so the
        // final "on" state is the one actually probed.
        if (probeRearmRef.current) {
          probeRearmRef.current = false;
          void probeMic(true);
        }
      }
    },
    [t, setError]
  );

  useEffect(() => {
    // Gate inside the effect: React runs effects even when the guest form is
    // returned, so guests must not get an iOS mic prompt (review #2155).
    if (!canAccess) return;
    void probeMic(audioEnabled);
  }, [canAccess, audioEnabled, probeMic]);

  // After returning from Settings, `permissionDeniedRef` may still hold a stale
  // denial: probe again on foreground (with the guard cleared) so a granted
  // permission clears the error banner instead of leaving a stale message.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!audioEnabled || !canAccess) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (appState.current.match(/inactive|background/) && state === 'active') {
        permissionDeniedRef.current = false;
        void probeMic(audioEnabled);
      }
      appState.current = state;
    });
    return () => sub.remove();
  }, [canAccess, audioEnabled, probeMic]);

  const handleAudioToggle = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    updateSettings({ micEnabled: next });
    // Re-arm only while a probe is in flight: otherwise the queued probe from
    // the audioEnabled change already covers the final "on" state.
    if (next && probingRef.current) probeRearmRef.current = true;
  }, [audioEnabled, updateSettings]);

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
              onToggle={handleAudioToggle}
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
            className="min-w-[10rem]"
            disabled={submitting}
            onPress={handleJoin}
          >
            <ThemedText numberOfLines={1} className="text-primary-foreground">
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
