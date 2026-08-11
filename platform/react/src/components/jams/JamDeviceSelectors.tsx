import {
  useMediaDeviceSelect,
  useRoomContext,
  useTrackToggle,
} from '@livekit/components-react';
import { LocalAudioTrack, LocalVideoTrack, Track } from 'livekit-client';
import {
  Check,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PopupMenuButton, type IconType } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { audioOutputSupported } from './constants';
import { JamToolbarButton } from './JamToolbarButton';

type DeviceType = 'mic' | 'camera' | 'speaker';

interface DeviceSelectorPillProps {
  enabled: boolean;
  onToggle: () => void;
  onIcon: IconType;
  offIcon: IconType;
  deviceType: DeviceType;
  devices: MediaDeviceInfo[];
  activeDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
}

/** Pill mirroring Svelte `DeviceSelectorAndSwitch.svelte`. */
export const DeviceSelectorPill = ({
  enabled,
  onToggle,
  onIcon: OnIcon,
  offIcon: OffIcon,
  deviceType,
  devices,
  activeDeviceId,
  onDeviceChange,
}: DeviceSelectorPillProps) => {
  const t = useT();
  const deviceLabel =
    deviceType === 'mic'
      ? t('jams.device.microphone')
      : deviceType === 'camera'
        ? t('jams.device.camera')
        : '';

  return (
    <JamToolbarButton
      title={`${enabled ? t('jams.device.turnOff') : t('jams.device.turnOn')}${deviceLabel ? ` ${deviceLabel}` : ''}`}
      tone={enabled ? 'default' : 'danger'}
      action={onToggle}
      menuTitle={t('jams.device.changeTitle')}
      menuChildren={
        <>
          {!enabled ? (
            <PopupMenuButton
              title={t('jams.device.turnOn')}
              action={onToggle}
              text={t('jams.device.turnOn')}
              icon={OnIcon}
            />
          ) : (
            <PopupMenuButton
              title={t('jams.device.turnOff')}
              action={onToggle}
              text={t('jams.device.turnOff')}
              icon={OffIcon}
            />
          )}
          {devices.length === 0 ? (
            <div className="p-2 text-sm">{t('jams.device.loadingDevices')}</div>
          ) : (
            devices.map((device) => (
              <PopupMenuButton
                key={device.deviceId}
                title={t('jams.device.switchTitle')}
                action={() => onDeviceChange(device.deviceId)}
                icon={OnIcon}
                textSlot={
                  <span className="flex w-full min-w-0 items-center gap-2">
                    <span className="truncate">
                      {device.label ||
                        (device.deviceId === 'default'
                          ? t('jams.device.defaultSpeaker')
                          : device.deviceId)}
                    </span>
                    {(device.deviceId === activeDeviceId ||
                      (activeDeviceId === '' &&
                        device.deviceId === 'default')) && (
                      <Check className="ml-auto size-4 shrink-0" />
                    )}
                  </span>
                }
              />
            ))
          )}
        </>
      }
    >
      {enabled ? <OnIcon /> : <OffIcon />}
    </JamToolbarButton>
  );
};

/** In-room microphone control mirroring `MicrophoneSelectorAndSwitch.svelte`. */
export const JamMicSelector = () => {
  const { enabled, toggle, track } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const { devices, activeDeviceId, setActiveMediaDevice } =
    useMediaDeviceSelect({
      kind: 'audioinput',
      track: track?.track as LocalAudioTrack | undefined,
      requestPermissions: true,
    });

  return (
    <DeviceSelectorPill
      enabled={enabled}
      onToggle={() => void toggle()}
      onIcon={Mic}
      offIcon={MicOff}
      deviceType="mic"
      devices={devices}
      activeDeviceId={activeDeviceId}
      onDeviceChange={(deviceId) => void setActiveMediaDevice(deviceId)}
    />
  );
};

/** In-room camera control mirroring `CameraSelectorAndSwitch.svelte`. */
export const JamCameraSelector = () => {
  const { enabled, toggle, track } = useTrackToggle({
    source: Track.Source.Camera,
  });
  const { devices, activeDeviceId, setActiveMediaDevice } =
    useMediaDeviceSelect({
      kind: 'videoinput',
      track: track?.track as LocalVideoTrack | undefined,
      requestPermissions: true,
    });

  return (
    <DeviceSelectorPill
      enabled={enabled}
      onToggle={() => void toggle()}
      onIcon={Video}
      offIcon={VideoOff}
      deviceType="camera"
      devices={devices}
      activeDeviceId={activeDeviceId}
      onDeviceChange={(deviceId) => void setActiveMediaDevice(deviceId)}
    />
  );
};

export interface JamAudioOutputSelectorProps {
  speakerDeviceId?: string;
  speakerEnabled: boolean;
  onSpeakerChange: (deviceId: string) => void;
  onToggleSpeaker: () => void;
}

/** In-room speaker control mirroring `AudioOutputSelector.svelte`. */
export const JamAudioOutputSelector = ({
  speakerDeviceId,
  speakerEnabled,
  onSpeakerChange,
  onToggleSpeaker,
}: JamAudioOutputSelectorProps) => {
  const room = useRoomContext();
  const { devices, activeDeviceId, setActiveMediaDevice } =
    useMediaDeviceSelect({
      kind: 'audiooutput',
      requestPermissions: false,
    });

  const handleDeviceChange = async (deviceId: string) => {
    await setActiveMediaDevice(deviceId).catch(() => undefined);
    onSpeakerChange(deviceId);
    if (audioOutputSupported) {
      await room
        .switchActiveDevice('audiooutput', deviceId, true)
        .catch(() => undefined);
    }
    document.querySelectorAll('audio').forEach((audio) => {
      if (audioOutputSupported && 'setSinkId' in audio) {
        void audio.setSinkId(deviceId).catch(() => undefined);
      }
    });
  };

  if (!audioOutputSupported) return null;

  return (
    <DeviceSelectorPill
      enabled={speakerEnabled}
      onToggle={onToggleSpeaker}
      onIcon={Volume2}
      offIcon={VolumeX}
      deviceType="speaker"
      devices={devices}
      activeDeviceId={activeDeviceId || speakerDeviceId || ''}
      onDeviceChange={(deviceId) => void handleDeviceChange(deviceId)}
    />
  );
};
