<script lang="ts">
  import { getLivekitRoom } from '../context';
  import {
    microphoneStateStore,
    jamSettingsStore,
    participantMicrophoneTrackStore,
  } from '../stores';
  import { Mic, MicOff } from 'lucide-svelte';
  import {
    createLocalAudioTrack,
    switchMicrophone,
    toggleMicrophone,
  } from '../actions';
  import DeviceSelectorAndSwitch from './DeviceSelectorAndSwitch.svelte';
  import { LocalAudioTrack, type LocalTrack, Room } from 'livekit-client';
  import type { Readable } from 'svelte/store';
  import { onMount } from 'svelte';

  interface Props {
    type?: 'room' | 'lobby';
    localAudioTrack?: LocalAudioTrack | undefined;
  }

  let { type = 'room', localAudioTrack = $bindable(undefined) }: Props =
    $props();
  let localState: boolean = $state(false);

  const isRoom = type === 'room';

  const room = getLivekitRoom();
  const currentTrack = participantMicrophoneTrackStore(
    room.localParticipant,
  ) as Readable<LocalTrack>;

  const microphoneState = microphoneStateStore(room.localParticipant);

  const handleLocalAudio = async () => {
    if ($jamSettingsStore.defaults.audio) {
      if (localAudioTrack) {
        localAudioTrack.mediaStreamTrack?.stop();
      }

      if ($jamSettingsStore.deviceIds.microphone) {
        localAudioTrack = await createLocalAudioTrack(
          $jamSettingsStore.deviceIds.microphone,
        );
      }
    } else {
      localAudioTrack?.mediaStreamTrack?.stop();
    }
    localState = localAudioTrack?.mediaStreamTrack?.readyState === 'live';
  };

  const switchMic = async (deviceId: string) => {
    $jamSettingsStore.deviceIds.microphone = deviceId;
    if (isRoom) {
      await switchMicrophone(room, deviceId);
    } else {
      await handleLocalAudio();
    }
  };

  const toggle = () => {
    if (isRoom) {
      toggleMicrophone(room);
    } else {
      $jamSettingsStore.defaults.audio = !$jamSettingsStore.defaults.audio;
      handleLocalAudio();
    }
  };

  onMount(() => {
    if (!isRoom) {
      handleLocalAudio();
    }
  });
</script>

<DeviceSelectorAndSwitch
  currentDeviceIdPromise={isRoom
    ? $currentTrack?.getDeviceId()
    : Promise.resolve(localAudioTrack?.getDeviceId())}
  availableDevices={Room.getLocalDevices('audioinput', true)}
  currentDeviceState={isRoom ? $microphoneState : localState}
  offIcon={MicOff}
  onIcon={Mic}
  onDeviceChanged={switchMic}
  onDeviceToggled={toggle}
  deviceType="mic"
/>
