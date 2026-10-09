import React, { useEffect, useState } from 'react';
import {
  AudioSession,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/react-native';
import { Room, RoomEvent } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  Volume2Icon,
  VolumeXIcon,
} from '../icons/index';
import type { iconWithClassName } from '../icons/iconWithClassName';
import { DropdownMenuItem } from '../ui/dropdown-menu';
import { ThemedText } from '../ui/themed-text';
import { JamToolbarButton, toneIconClass } from './JamToolbarButton';

type DeviceType = 'mic' | 'camera' | 'speaker';
export type JamIconType = ReturnType<typeof iconWithClassName>;

export interface JamDevice {
  deviceId: string;
  label: string;
}

interface DeviceSelectorPillProps {
  enabled: boolean;
  onToggle: () => void;
  onIcon: JamIconType;
  offIcon: JamIconType;
  deviceType: DeviceType;
  /** Omit when the platform offers no device list (e.g. microphones). */
  devices?: JamDevice[];
  activeDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
}

/** Toggle pill with a drop-up listing the available devices. */
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
  const { t } = useTranslation();
  const tone = enabled ? 'default' : 'danger';
  const deviceLabel =
    deviceType === 'mic'
      ? t('jams.device.microphone')
      : deviceType === 'camera'
        ? t('jams.device.camera')
        : '';
  const ToggleIcon = enabled ? OffIcon : OnIcon;

  return (
    <JamToolbarButton
      title={`${enabled ? t('jams.device.turnOff') : t('jams.device.turnOn')}${deviceLabel ? ` ${deviceLabel}` : ''}`}
      tone={tone}
      action={onToggle}
      menuTitle={t('jams.device.changeTitle')}
      menuChildren={
        <>
          <DropdownMenuItem
            className="flex-row items-center gap-x-2"
            onPress={onToggle}
          >
            <ToggleIcon size={16} className="text-foreground" />
            <ThemedText>
              {enabled ? t('jams.device.turnOff') : t('jams.device.turnOn')}
            </ThemedText>
          </DropdownMenuItem>
          {devices && devices.length === 0 ? (
            <ThemedText className="p-2 text-sm">
              {t('jams.device.loadingDevices')}
            </ThemedText>
          ) : null}
          {devices?.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              className="flex-row items-center gap-x-2"
              onPress={() => onDeviceChange?.(device.deviceId)}
            >
              <OnIcon size={16} className="text-foreground" />
              <ThemedText numberOfLines={1} className="min-w-0 flex-1">
                {device.label ||
                  (device.deviceId === 'default'
                    ? t('jams.device.defaultSpeaker')
                    : device.deviceId)}
              </ThemedText>
              {device.deviceId === activeDeviceId ||
              (activeDeviceId === '' && device.deviceId === 'default') ? (
                <CheckIcon size={16} className="text-foreground" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </>
      }
    >
      {enabled ? (
        <OnIcon size={20} className={toneIconClass[tone]} />
      ) : (
        <OffIcon size={20} className={toneIconClass[tone]} />
      )}
    </JamToolbarButton>
  );
};

/** Camera devices known to the room, refreshed on device changes. */
export const useCameraDevices = (room: Room) => {
  const [devices, setDevices] = useState<JamDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState(
    room.getActiveDevice('videoinput') ?? ''
  );

  useEffect(() => {
    const load = () =>
      Room.getLocalDevices('videoinput', false)
        .then((list) =>
          setDevices(list.map(({ deviceId, label }) => ({ deviceId, label })))
        )
        .catch(() => undefined);
    const onActive = (kind: string, deviceId: string) => {
      if (kind === 'videoinput') setActiveDeviceId(deviceId);
    };
    void load();
    room
      .on(RoomEvent.MediaDevicesChanged, load)
      .on(RoomEvent.ActiveDeviceChanged, onActive);
    return () => {
      room
        .off(RoomEvent.MediaDevicesChanged, load)
        .off(RoomEvent.ActiveDeviceChanged, onActive);
    };
  }, [room]);

  return { devices, activeDeviceId };
};

/** Audio outputs exposed by the native audio session. */
export const useAudioOutputs = () => {
  const [devices, setDevices] = useState<JamDevice[]>([]);

  useEffect(() => {
    AudioSession.getAudioOutputs()
      .then((outputs) =>
        setDevices(outputs.map((id) => ({ deviceId: id, label: id })))
      )
      .catch(() => undefined);
  }, []);

  return devices;
};

/** In-room microphone control. Native exposes no selectable mic list. */
export const JamMicSelector = () => {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  return (
    <DeviceSelectorPill
      enabled={isMicrophoneEnabled}
      onToggle={() =>
        void localParticipant
          .setMicrophoneEnabled(!isMicrophoneEnabled)
          .catch(() => undefined)
      }
      onIcon={MicIcon}
      offIcon={MicOffIcon}
      deviceType="mic"
    />
  );
};

/** In-room camera control with camera switching. */
export const JamCameraSelector = () => {
  const room = useRoomContext();
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  const { devices, activeDeviceId } = useCameraDevices(room);

  return (
    <DeviceSelectorPill
      enabled={isCameraEnabled}
      onToggle={() =>
        void localParticipant
          .setCameraEnabled(!isCameraEnabled)
          .catch(() => undefined)
      }
      onIcon={VideoIcon}
      offIcon={VideoOffIcon}
      deviceType="camera"
      devices={devices}
      activeDeviceId={activeDeviceId}
      onDeviceChange={(deviceId) =>
        void room
          .switchActiveDevice('videoinput', deviceId)
          .catch(() => undefined)
      }
    />
  );
};

export interface JamAudioOutputSelectorProps {
  speakerDeviceId?: string;
  speakerEnabled: boolean;
  onSpeakerChange: (deviceId: string) => void;
  onToggleSpeaker: () => void;
}

/** In-room speaker control. */
export const JamAudioOutputSelector = ({
  speakerDeviceId,
  speakerEnabled,
  onSpeakerChange,
  onToggleSpeaker,
}: JamAudioOutputSelectorProps) => {
  const devices = useAudioOutputs();

  const handleDeviceChange = (deviceId: string) => {
    onSpeakerChange(deviceId);
    void AudioSession.selectAudioOutput(deviceId).catch(() => undefined);
  };

  return (
    <DeviceSelectorPill
      enabled={speakerEnabled}
      onToggle={onToggleSpeaker}
      onIcon={Volume2Icon}
      offIcon={VolumeXIcon}
      deviceType="speaker"
      devices={devices}
      activeDeviceId={speakerDeviceId ?? ''}
      onDeviceChange={handleDeviceChange}
    />
  );
};
