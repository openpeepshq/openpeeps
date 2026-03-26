<script lang="ts">
  import { Volume2, VolumeX } from 'lucide-svelte';
  import { getLivekitRoom } from '../context';
  import { jamSettingsStore } from '../stores';
  import DeviceSelectorAndSwitch from './DeviceSelectorAndSwitch.svelte';
  import { Room } from 'livekit-client';
  import { onMount } from 'svelte';
  import { toggleSpeaker } from '../actions';

  interface Props {
    type?: 'room' | 'lobby';
    audioElement?: HTMLAudioElement;
  }

  let { type = 'room', audioElement }: Props = $props();

  const isRoom = type === 'room';
  const room = getLivekitRoom();

  let localState = $state($jamSettingsStore.defaults.speaker ?? true);

  /** setSinkId is not supported in Firefox (only in 116+); avoid calling it or LiveKit audiooutput APIs when unsupported. */
  const audioOutputSwitchSupported =
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype;

  const getSinkId = (element?: HTMLAudioElement): string | undefined => {
    if (!element || !('sinkId' in element)) return undefined;
    return (element as HTMLAudioElement & { sinkId?: string }).sinkId;
  };

  async function loadDevices() {
    if (audioOutputSwitchSupported) {
      try {
        await Room.getLocalDevices('audiooutput', true);
      } catch (e) {
        console.warn('Could not load audio output devices', e);
      }
    }
  }

  $effect(() => {
    loadDevices();
  });

  const handleLocalAudio = async () => {
    const isEnabled = $jamSettingsStore.defaults.speaker ?? true;
    localState = isEnabled;

    if (audioElement) {
      audioElement.muted = !isEnabled;
      if (isEnabled) audioElement.volume = 1;

      if ($jamSettingsStore.deviceIds.speaker && audioOutputSwitchSupported) {
        try {
          await audioElement.setSinkId($jamSettingsStore.deviceIds.speaker);
        } catch (e) {
          console.warn('Audio output device not applied (e.g. setSinkId unsupported in this browser)', e);
        }
      }
    }
  };

  const switchDevice = async (deviceId: string) => {
    $jamSettingsStore.deviceIds.speaker = deviceId;

    if (isRoom && audioOutputSwitchSupported) {
      try {
        await room.switchActiveDevice('audiooutput', deviceId, true);
      } catch (error) {
        console.warn('Cannot switch audio output (e.g. setSinkId not supported in this browser)', error);
      }
    }

    if (!isRoom || audioElement) {
      await handleLocalAudio();
    }
  };

  const toggle = () => {
    if (isRoom) {
      toggleSpeaker(localState);
    } else {
      $jamSettingsStore.defaults.speaker = !$jamSettingsStore.defaults.speaker;
      handleLocalAudio();
    }
  };

  onMount(() => {
    if (!isRoom) {
      handleLocalAudio();
    }
  });

  const currentDeviceIdPromise = $derived(
    Promise.resolve(
      getSinkId(audioElement) ||
        $jamSettingsStore.deviceIds.speaker ||
        undefined,
    ),
  );
</script>

<DeviceSelectorAndSwitch
  {currentDeviceIdPromise}
  availableDevices={audioOutputSwitchSupported ? Room.getLocalDevices('audiooutput', true) : Promise.resolve([])}
  currentDeviceState={isRoom ? localState : localState}
  offIcon={VolumeX}
  onIcon={Volume2}
  onDeviceChanged={switchDevice}
  onDeviceToggled={toggle}
  deviceType="speaker"
/>
