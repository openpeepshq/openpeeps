<script lang="ts">
  import { Video, VideoOff } from 'lucide-svelte';
  import { getJamContext, getLivekitRoom } from '../context';
  import {
    jamSettingsStore,
    cameraStateStore,
    participantCameraTrackStore,
  } from '../stores';
  import { createVideoStream, switchCamera, toggleCamera } from '../actions';
  import DeviceSelectorAndSwitch from './DeviceSelectorAndSwitch.svelte';
  import { type LocalTrack, LocalVideoTrack, Room } from 'livekit-client';
  import type { Readable } from 'svelte/store';
  import { onMount } from 'svelte';
  import { getCurrentProfileSettings } from '$lib/auth';

  interface Props {
    type?: 'room' | 'lobby';
    localVideoTrack?: LocalVideoTrack | undefined;
  }

  let { type = 'room', localVideoTrack = $bindable(undefined) }: Props =
    $props();
  let localState: boolean = $state(false);
  const isRoom = type === 'room';

  const profileSettings = getCurrentProfileSettings();

  const room = getLivekitRoom();
  const { jam } = getJamContext();

  const currentTrack = participantCameraTrackStore(
    room.localParticipant,
  ) as Readable<LocalTrack>;

  const cameraState = cameraStateStore(room.localParticipant);

  const handleLocalVideo = async () => {
    if ($jamSettingsStore.defaults.video) {
      const stream = await createVideoStream(
        $jamSettingsStore.deviceIds.camera,
        jam,
        profileSettings?.jamSettings,
      );
      if (stream?.getVideoTracks().length) {
        localVideoTrack = new LocalVideoTrack(stream?.getVideoTracks()[0]!);
      }
    } else {
      localVideoTrack?.mediaStreamTrack?.stop();
      localVideoTrack = undefined;
    }
    localState = localVideoTrack?.mediaStreamTrack?.readyState === 'live';
  };

  const switchDevice = async (deviceId: string) => {
    $jamSettingsStore.deviceIds.camera = deviceId;
    if (isRoom) {
      await switchCamera(room, deviceId, jam, profileSettings?.jamSettings);
    } else {
      await handleLocalVideo();
    }
  };

  const toggle = () => {
    if (isRoom) {
      toggleCamera(
        room,
        $jamSettingsStore.deviceIds.camera,
        jam,
        profileSettings?.jamSettings,
      );
    } else {
      $jamSettingsStore.defaults.video = !$jamSettingsStore.defaults.video;
      handleLocalVideo();
    }
  };
  onMount(() => {
    if (!isRoom) {
      handleLocalVideo();
    }
  });
</script>

<DeviceSelectorAndSwitch
  currentDeviceIdPromise={isRoom
    ? $currentTrack?.getDeviceId()
    : Promise.resolve(localVideoTrack?.getDeviceId())}
  availableDevices={Room.getLocalDevices('videoinput', true)}
  currentDeviceState={isRoom ? $cameraState : localState}
  offIcon={VideoOff}
  onIcon={Video}
  onDeviceChanged={switchDevice}
  onDeviceToggled={toggle}
  deviceType="camera"
/>
