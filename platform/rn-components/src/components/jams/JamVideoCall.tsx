import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { AudioSession, useRoomContext } from '@livekit/react-native';
import type { DisconnectReason } from 'livekit-client';
import { MediaDeviceFailure } from 'livekit-client';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useStableLiveKitRoom } from '../../lib/livekit/useStableLiveKitRoom';
import { JamConference } from './JamConference';

export interface JamVideoCallProps {
  token: string;
  serverUrl: string;
  /** Initial audio/video defaults. Useful for hand-off from `<JamLobby>`. */
  audio?: boolean;
  video?: boolean;
  /** Fired when the participant leaves the room, with LiveKit's reason. */
  onDisconnected?: (reason?: DisconnectReason) => void;
}

const openSettings = () => {
  void Linking.openSettings();
};

/**
 * `Alert.alert` cannot be re-triggered while the same alert is already
 * showing; fire-and-forget toast/permission flows can race on both platforms
 * (dual toasts for one failure, or a rejected alert promise). Deduplicate
 * through a module-level in-flight guard so a burst of failures surfaces one
 * message instead of stacking toasts.
 */
let micToastInFlight = false;
const showMicToast = (msg: string) => {
  if (micToastInFlight) return;
  micToastInFlight = true;
  Toast.show({ type: 'error', text1: msg });
  setTimeout(() => {
    micToastInFlight = false;
  }, 3000);
};

/**
 * LiveKit can emit several failure events for one rejection; coalesce them
 * into a single permission alert with a short cooldown, and swallow the
 * "alert already presented" throw that iOS raises for overlaps.
 */
let lastMicAlertAt = 0;
const showMicPermissionAlertModule = (alert: () => void) => {
  if (Date.now() - lastMicAlertAt < 8000) return;
  lastMicAlertAt = Date.now();
  try {
    alert();
  } catch {
    // An identical alert is already on screen.
  }
};

/**
 * Connects the app-level LiveKit `Room` (provided by the host via
 * `RoomContext.Provider`) and renders {@link JamConference}. The room object is
 * created once at app start so the first paint is never blank; see
 * `useStableLiveKitRoom` for why the stock `LiveKitRoom` is not used.
 */
export const JamVideoCall = ({
  token,
  serverUrl,
  audio = true,
  video = true,
  onDisconnected,
}: JamVideoCallProps) => {
  const { t } = useTranslation();
  const room = useRoomContext();

  // Session is a hard failure on iPad (#2108): iOS will not capture mic audio
  // without an active audio session, so configure and start it on iOS before
  // connect. Android gains nothing from the iOS-only
  // `setAppleAudioConfiguration` — configuring Apple audio there rejects and
  // previously aborted the whole setup — so the session is skipped there
  // entirely (the native module starts its own session on first use).
  const audioSessionReady = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void (async () => {
      try {
        await AudioSession.setAppleAudioConfiguration({
          audioCategory: 'playAndRecord',
          audioCategoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          audioMode: 'videoChat',
        });
        await AudioSession.startAudioSession();
        audioSessionReady.current = true;
      } catch (err: unknown) {
        // Non-fatal: connect still proceeds, but iOS capture stays silent
        // until the SignalConnected retry below re-arms the session.
        console.warn('[jams:mic] AudioSession setup failed', err);
      }
    })();
    return () => {
      audioSessionReady.current = false;
      void AudioSession.stopAudioSession();
    };
  }, []);

  // One permission alert at a time: LiveKit can emit several failure events
  // (SignalConnected + MediaDevicesError) for the same rejection, and
  // `Alert.alert` throws when the identical alert is already visible.
  const showMicPermissionAlert = useCallback(() => {
    showMicPermissionAlertModule(() =>
      Alert.alert(
        t('jams.mic.permissionTitle'),
        t('jams.mic.permissionMessage'),
        [
          { text: t('common.actions.cancel'), style: 'cancel' },
          { text: t('media.permissions.openSettings'), onPress: openSettings },
        ]
      )
    );
  }, [t]);

  // Surface room-level mic failures. `onError` is NOT mic-specific — the same
  // callback also fires for camera-enable rejections and connect failures —
  // so gate the mic copy on a real device denial: only "permission denied"
  // (which here can only come from a mic/camera capture rejection) shows
  // mic-specific copy plus the settings alert; everything else is logged and
  // left to the generic paths that carry the failure `kind`.
  const handleError = useCallback(
    (error: Error) => {
      const denied =
        MediaDeviceFailure.getFailure(error) ===
        MediaDeviceFailure.PermissionDenied;
      if (!denied) {
        console.warn(
          '[jams:mic] non-permission failure (not mic-gated)',
          error
        );
        return;
      }
      console.warn('[jams:mic] mic permission denied', error);
      showMicToast(t('jams.mic.lobbyProbeFailed'));
      showMicPermissionAlert();
    },
    [t, showMicPermissionAlert]
  );

  // `kind` disambiguates the device source; only genuine mic failures get
  // mic copy here (short copy in the toast, long copy in the settings alert).
  const handleMediaDeviceFailure = useCallback(
    (
      failure?: ReturnType<typeof MediaDeviceFailure.getFailure>,
      kind?: string
    ) => {
      if (kind !== 'audioinput') return;
      console.warn('[jams:mic] media device failure', kind, failure);
      showMicToast(
        failure === MediaDeviceFailure.PermissionDenied
          ? t('jams.mic.lobbyProbeFailed')
          : t('jams.mic.enableFailed')
      );
      if (failure === MediaDeviceFailure.PermissionDenied) {
        showMicPermissionAlert();
      }
    },
    [t, showMicPermissionAlert]
  );

  const handleDisconnected = useCallback(
    (reason?: DisconnectReason) => {
      onDisconnected?.(reason);
    },
    [onDisconnected]
  );

  useStableLiveKitRoom(room, {
    token,
    serverUrl,
    connect: true,
    audio,
    video,
    screen: false,
    onError: handleError,
    onMediaDeviceFailure: handleMediaDeviceFailure,
    onDisconnected: handleDisconnected,
    onSignalConnected: async () => {
      // iOS capture is silent without an active session; if the pre-connect
      // setup was skipped (Android) or failed, re-arm it right before the
      // mic is enabled so the first attempt is not a guaranteed loss.
      if (Platform.OS === 'ios' && !audioSessionReady.current) {
        try {
          await AudioSession.setAppleAudioConfiguration({
            audioCategory: 'playAndRecord',
            audioCategoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
            audioMode: 'videoChat',
          });
          await AudioSession.startAudioSession();
          audioSessionReady.current = true;
        } catch (err: unknown) {
          console.warn('[jams:mic] AudioSession retry failed', err);
        }
      }
    },
  });

  return <JamConference />;
};
