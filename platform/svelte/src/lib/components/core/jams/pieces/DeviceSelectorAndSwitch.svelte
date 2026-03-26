<script lang="ts">
  import { ChevronUpIcon, Check } from 'lucide-svelte';
  import type { LocalTrack } from 'livekit-client';
  import { PopupMenu, PopupMenuButton, Button } from '@openpeeps/ui';
  import type { IconType } from '@openpeeps/ui';

  interface Props {
    currentDeviceIdPromise: Promise<string | undefined>;
    currentDeviceState: boolean;
    availableDevices: Promise<MediaDeviceInfo[]>;
    onIcon: IconType;
    offIcon: IconType;
    deviceType: 'mic' | 'camera' | 'speaker';
    onDeviceChanged?: (deviceId: string) => void;
    onDeviceToggled?: () => void;
  }

  let {
    currentDeviceIdPromise,
    currentDeviceState,
    availableDevices,
    onIcon: OnIcon,
    offIcon: OffIcon,
    deviceType,
    onDeviceChanged = () => {},
    onDeviceToggled = () => {},
  }: Props = $props();
</script>

<div class="bg-surface-100 flex items-center rounded-full backdrop-blur">
  <Button
    title={`Turn ${currentDeviceState ? 'off' : 'on'} ${deviceType === 'mic' ? 'microphone' : 'camera'}`}
    class="size-10 p-0 md:p-2"
    variant={currentDeviceState
      ? 'variant-soft-surface'
      : 'variant-filled-error'}
    action={onDeviceToggled}
  >
    {#if currentDeviceState}
      <OnIcon />
    {:else}
      <OffIcon />
    {/if}
  </Button>

  <PopupMenu
    placement="top-start"
    title="Change Device"
    icon={ChevronUpIcon}
    class="p-0.5"
    iconSize={20}
  >
    {#if !currentDeviceState}
      <PopupMenuButton
        title="Turn on"
        action={onDeviceToggled}
        text="Turn on"
        icon={OnIcon}
      />
    {:else}
      <PopupMenuButton
        title="Turn off"
        action={onDeviceToggled}
        text="Turn off"
        icon={OffIcon}
      />
    {/if}
    {#await Promise.all([availableDevices, currentDeviceIdPromise])}
      <div>Loading available devices ...</div>
    {:then [availableDevices, currentDeviceId]}
      {#each availableDevices as device}
        <PopupMenuButton
          title="Switch Device"
          action={() => {
            onDeviceChanged(device.deviceId);
          }}
          icon={OnIcon}
        >
          {#snippet textSnippet()}
            <span class="truncate">
              {device.label ||
                (device.deviceId === 'default'
                  ? 'Default Speaker'
                  : device.deviceId)}
            </span>
            {#if device.deviceId === currentDeviceId || (currentDeviceId === '' && device.deviceId === 'default')}
              <Check class="ml-auto size-4" />
            {/if}
          {/snippet}
        </PopupMenuButton>
      {/each}
    {/await}
  </PopupMenu>
</div>
