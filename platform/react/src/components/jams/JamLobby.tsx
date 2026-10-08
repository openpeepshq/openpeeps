import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  type LocalUserChoices,
  useMediaDevices,
  usePreviewTracks,
} from '@livekit/components-react';
import { type LocalVideoTrack, Track } from 'livekit-client';
import { Blur, Button } from '@openpeepshq/react-ui';
import { useNavigate } from '../../contexts/router';
import { useT } from '../../i18n';
import { useJamLobby } from '../../hooks/jams/useJamLobby';
import type { JamJoinParams } from '../../hooks/jams/useJamRoom';
import { audioOutputSupported } from './constants';
import { DeviceSelectorPill } from './JamDeviceSelectors';
import { JamGuestForm } from './JamGuestForm';
import { JamToolbarButton } from './JamToolbarButton';
import { useJamLocalSettings } from './jamLocalSettings';

export interface JamLobbyProps {
  /** Called once the user has picked devices and the join token has been obtained. */
  onJoin: (params: JamJoinParams) => void;
}

/**
 * Pre-room screen. Guests without a jam-scoped pass see {@link JamGuestForm};
 * authenticated users get a device-selection card that mirrors the Svelte
 * lobby (`lobby/Lobby.svelte` + `DeviceSelectionForm.svelte`): a centered card
 * with a square camera preview, mic/camera controls, and a join button. The
 * preview tracks and device lists come from `@livekit/components-react`.
 */
export function JamLobby({ onJoin }: JamLobbyProps) {
  const t = useT();
  const navigate = useNavigate();
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
  const [audioDeviceId, setAudioDeviceId] = useState('');
  const [videoDeviceId, setVideoDeviceId] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  const audioDevices = useMediaDevices({ kind: 'audioinput' });
  const videoDevices = useMediaDevices({ kind: 'videoinput' });
  const speakerDevices = useMediaDevices({ kind: 'audiooutput' });

  // Video preview only — mic state is persisted for join but not acquired here,
  // mirroring Svelte's separate CameraSelectorAndSwitch track management.
  const trackOptions = useMemo(
    () => ({
      audio: false,
      video: videoEnabled
        ? videoDeviceId
          ? { deviceId: videoDeviceId }
          : true
        : false,
    }),
    [videoEnabled, videoDeviceId],
  );

  const onPreviewError = useCallback(
    (err: Error) => {
      setError(err.message);
    },
    [setError],
  );

  const tracks = usePreviewTracks(trackOptions, onPreviewError);
  const videoTrack = tracks?.find(
    (track): track is LocalVideoTrack => track.kind === Track.Kind.Video,
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!videoTrack || !el) return;
    videoTrack.attach(el);
    return () => {
      videoTrack.detach(el);
    };
  }, [videoTrack]);

  // Apply / remove the greenscreen blur on the preview track to mirror Svelte's
  // lobby `BlurSwitch`.
  useEffect(() => {
    if (!videoTrack) return;
    let cancelled = false;
    if (settings.blur) {
      void import('./blurProcessor').then(({ createBlurProcessor }) => {
        if (cancelled) return;
        void videoTrack
          .setProcessor(createBlurProcessor())
          .catch(() => undefined);
      });
    } else {
      void videoTrack.stopProcessor().catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [videoTrack, settings.blur]);

  const showVideo = videoTrack?.mediaStreamTrack?.readyState === 'live';

  if (!canAccess) {
    return <JamGuestForm />;
  }

  const exitLobby = () => {
    navigate({ type: 'jams' });
  };

  const handleJoin = () =>
    join<LocalUserChoices>({
      username,
      audioEnabled,
      videoEnabled,
      audioDeviceId,
      videoDeviceId,
    });

  return (
    <div className="mx-auto flex h-full w-full max-w-lg items-center justify-center p-4">
      <div className="bg-background w-full rounded-md border p-4">
        <div className="flex items-center justify-between border-b p-2">
          <h2 className="text-lg">
            {t('jams.lobby.readyTitle', { defaultValue: 'Ready to join' })}
          </h2>
          <button
            type="button"
            title={t('jams.exit.title', { defaultValue: 'Leave' })}
            className="bg-surface-2 flex size-8 items-center justify-center rounded-full"
            onClick={exitLobby}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col items-center p-5">
          <h2 className="my-1 text-center text-lg">
            {jamEvent.name ||
              t('jams.lobby.fallbackTitle', { defaultValue: 'Jam' })}
          </h2>

          <div className="relative size-64">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`size-64 rounded-xl object-cover ${showVideo ? '' : 'hidden'}`}
            />
            {!showVideo ? (
              <div className="bg-surface flex size-64 items-center justify-center rounded-xl">
                <p className="text-lg">
                  {t('jams.lobby.cameraOff', { defaultValue: 'Camera is off' })}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex w-full items-center justify-center gap-x-4">
            <DeviceSelectorPill
              enabled={audioEnabled}
              onToggle={() => setAudioEnabled((on) => !on)}
              onIcon={Mic}
              offIcon={MicOff}
              deviceType="mic"
              devices={audioDevices}
              activeDeviceId={audioDeviceId}
              onDeviceChange={setAudioDeviceId}
            />
            {audioOutputSupported ? (
              <DeviceSelectorPill
                enabled={settings.speakerEnabled}
                onToggle={() =>
                  updateSettings({ speakerEnabled: !settings.speakerEnabled })
                }
                onIcon={Volume2}
                offIcon={VolumeX}
                deviceType="speaker"
                devices={speakerDevices}
                activeDeviceId={settings.speakerDeviceId}
                onDeviceChange={(speakerDeviceId) =>
                  updateSettings({ speakerDeviceId })
                }
              />
            ) : null}
            <DeviceSelectorPill
              enabled={videoEnabled}
              onToggle={() => setVideoEnabled((on) => !on)}
              onIcon={Video}
              offIcon={VideoOff}
              deviceType="camera"
              devices={videoDevices}
              activeDeviceId={videoDeviceId}
              onDeviceChange={setVideoDeviceId}
            />
            <JamToolbarButton
              title={
                settings.blur
                  ? t('jams.blur.turnOff', { defaultValue: 'Turn off blur' })
                  : t('jams.blur.blurBackground', {
                      defaultValue: 'Blur background',
                    })
              }
              tone={settings.blur ? 'active' : 'default'}
              action={() => updateSettings({ blur: !settings.blur })}
            >
              <Blur />
            </JamToolbarButton>
          </div>
        </div>

        <div className="flex w-full flex-col items-center px-5 pb-4">
          <Button
            variant="default"
            title={t('jams.join.submit', { defaultValue: 'Join Jam' })}
            loading={submitting}
            action={handleJoin}
          >
            {jamActive
              ? t('jams.join.ctaJoin', { defaultValue: 'Join' })
              : t('jams.join.ctaStart', { defaultValue: 'Start' })}
          </Button>
          {error ? (
            <div role="alert" className="text-destructive mt-3 text-sm">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
