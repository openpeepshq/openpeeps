import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, X } from 'lucide-react';
import {
  type LocalUserChoices,
  useMediaDevices,
  usePreviewTracks,
} from '@livekit/components-react';
import { type LocalVideoTrack, Track } from 'livekit-client';
import { profileName } from '@openpeeps/common/lib';
import { Blur, Button } from '@openpeeps/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useJamContext } from './JamContext';
import { JamGuestForm } from './JamGuestForm';
import { useJamLocalSettings } from './jamLocalSettings';

export interface JamLobbyProps {
  /** Called once the user has picked devices and the join token has been obtained. */
  onJoin: (params: {
    token: string;
    livekitUrl: string;
    choices: LocalUserChoices;
  }) => void;
}

function canAccessJamLobby(
  profile: ReturnType<typeof useCurrentProfile>,
  jamPostId: string,
) {
  if (!profile) return false;
  if (profile.type === 'local') return true;
  return (
    profile.guestData?.resource?.type === 'jams' &&
    profile.guestData.resource.id === jamPostId
  );
}

interface DeviceControlProps {
  enabled: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
  OnIcon: typeof Mic;
  OffIcon: typeof MicOff;
  devices: MediaDeviceInfo[];
  deviceId: string;
  onDeviceChange: (deviceId: string) => void;
  /** Hide the device picker so the control shows the toggle icon only. */
  iconOnly?: boolean;
}

/** Pill mirroring the Svelte "selector and switch" controls (toggle + device list). */
function DeviceControl({
  enabled,
  onToggle,
  onLabel,
  offLabel,
  OnIcon,
  OffIcon,
  devices,
  deviceId,
  onDeviceChange,
  iconOnly = false,
}: DeviceControlProps) {
  return (
    <div className="bg-surface-100 flex items-center gap-1 rounded-full border p-1">
      <button
        type="button"
        title={enabled ? offLabel : onLabel}
        onClick={onToggle}
        className={`flex size-9 items-center justify-center rounded-full ${enabled ? '' : 'bg-surface-200'}`}
      >
        {enabled ? (
          <OnIcon className="size-4" />
        ) : (
          <OffIcon className="size-4" />
        )}
      </button>
      {!iconOnly && devices.length > 1 ? (
        <select
          value={deviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          className="max-w-[6rem] truncate bg-transparent pr-1 text-xs outline-none"
        >
          <option value="">{onLabel}</option>
          {devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `${index + 1}`}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

/** Speaker (audio output) selector for the lobby. Icon-only: the chosen device
 * is persisted and applied to the room's audio output on join, and there is no
 * on/off toggle since no audio is playing pre-room. */
function SpeakerControl({ label }: { label: string }) {
  return (
    <div className="bg-surface-100 flex items-center gap-1 rounded-full border p-1">
      <span
        title={label}
        className="flex size-9 items-center justify-center rounded-full"
      >
        <Volume2 className="size-4" />
      </span>
    </div>
  );
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
  const me = useCurrentProfile();
  const { jamPost, jamEvent } = useJamContext();
  const { client, openpeepsApi } = useOpenpeeps();
  const jamStateQuery = openpeepsApi.useJamState(jamPost.id);
  const jamActive = !!jamStateQuery.data?.active;

  const [settings, updateSettings] = useJamLocalSettings();

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioDeviceId, setAudioDeviceId] = useState('');
  const [videoDeviceId, setVideoDeviceId] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const audioDevices = useMediaDevices({ kind: 'audioinput' });
  const videoDevices = useMediaDevices({ kind: 'videoinput' });

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

  const onPreviewError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

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

  if (!canAccessJamLobby(me, jamPost.id)) {
    return <JamGuestForm />;
  }

  const exitLobby = () => {
    if (window.confirm(t('jams.lobby.exitLobbyBody', { defaultValue: '' }))) {
      navigate('/jams');
    }
  };

  const handleJoin = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await client.jams.token({
        pathParameters: { id: jamPost.id },
      });
      if ('error' in res) {
        const message = (res as { error?: { message?: string } }).error
          ?.message;
        setError(
          message ??
            t('jams.lobby.tokenError', {
              defaultValue: 'Failed to get jam token',
            }),
        );
        return;
      }
      const { token, livekitUrl } = res.data;
      onJoin({
        token,
        livekitUrl,
        choices: {
          username: (me ? profileName(me) : '') ?? '',
          audioEnabled,
          videoEnabled,
          audioDeviceId,
          videoDeviceId,
        },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-lg items-center justify-center p-4">
      <div className="bg-surface-50 w-full rounded-md border p-4">
        <div className="flex items-center justify-between border-b p-2">
          <h2 className="text-lg">
            {t('jams.lobby.readyTitle', { defaultValue: 'Ready to join' })}
          </h2>
          <button
            type="button"
            title={t('jams.exit.title', { defaultValue: 'Leave' })}
            className="bg-surface-200 flex size-8 items-center justify-center rounded-full"
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
              <div className="bg-surface-100 flex size-64 items-center justify-center rounded-xl">
                <p className="text-lg">
                  {t('jams.lobby.cameraOff', { defaultValue: 'Camera is off' })}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex w-full justify-center gap-2">
            <DeviceControl
              enabled={audioEnabled}
              onToggle={() => setAudioEnabled((on) => !on)}
              onLabel={`${t('jams.device.turnOn', { defaultValue: 'Turn on' })} ${t('jams.device.microphone', { defaultValue: 'microphone' })}`}
              offLabel={`${t('jams.device.turnOff', { defaultValue: 'Turn off' })} ${t('jams.device.microphone', { defaultValue: 'microphone' })}`}
              OnIcon={Mic}
              OffIcon={MicOff}
              devices={audioDevices}
              deviceId={audioDeviceId}
              onDeviceChange={setAudioDeviceId}
              iconOnly
            />
            <SpeakerControl
              label={t('jams.device.defaultSpeaker', {
                defaultValue: 'Default Speaker',
              })}
            />
            <DeviceControl
              enabled={videoEnabled}
              onToggle={() => setVideoEnabled((on) => !on)}
              onLabel={`${t('jams.device.turnOn', { defaultValue: 'Turn on' })} ${t('jams.device.camera', { defaultValue: 'camera' })}`}
              offLabel={`${t('jams.device.turnOff', { defaultValue: 'Turn off' })} ${t('jams.device.camera', { defaultValue: 'camera' })}`}
              OnIcon={Video}
              OffIcon={VideoOff}
              devices={videoDevices}
              deviceId={videoDeviceId}
              onDeviceChange={setVideoDeviceId}
            />
            <button
              type="button"
              title={
                settings.blur
                  ? t('jams.blur.turnOff', { defaultValue: 'Turn off blur' })
                  : t('jams.blur.blurBackground', {
                      defaultValue: 'Blur background',
                    })
              }
              onClick={() => updateSettings({ blur: !settings.blur })}
              className={`flex size-11 items-center justify-center rounded-full border ${settings.blur ? 'bg-primary text-primary-foreground' : 'bg-surface-100'}`}
            >
              <Blur className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col items-center px-5 pb-4">
          <Button
            variant="variant-filled-primary"
            title={t('jams.join.submit', { defaultValue: 'Join Jam' })}
            loading={submitting}
            action={handleJoin}
            className="rounded-full"
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
