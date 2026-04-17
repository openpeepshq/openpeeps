<script lang="ts">
  import { ChevronUpIcon, Check } from 'lucide-svelte';
  import type { LocalTrack } from 'livekit-client';
  import { PopupMenu, PopupMenuButton, Button } from '@openpeeps/ui';
  import type { IconType } from '@openpeeps/ui';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();

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
    title={`${currentDeviceState ? t('jams.device.turnOff') : t('jams.device.turnOn')} ${deviceType === 'mic' ? t('jams.device.microphone') : t('jams.device.camera')}`}
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
    title={t('jams.device.changeTitle')}
    icon={ChevronUpIcon}
    class="p-0.5"
    iconSize={20}
  >
    {#if !currentDeviceState}
      <PopupMenuButton
        title={t('jams.device.turnOn')}
        action={onDeviceToggled}
        text={t('jams.device.turnOn')}
        icon={OnIcon}
      />
    {:else}
      <PopupMenuButton
        title={t('jams.device.turnOff')}
        action={onDeviceToggled}
        text={t('jams.device.turnOff')}
        icon={OffIcon}
      />
    {/if}
    {#await Promise.all([availableDevices, currentDeviceIdPromise])}
      <div>{t('jams.device.loadingDevices')}</div>
    {:then [availableDevices, currentDeviceId]}
      {#each availableDevices as device}
        <PopupMenuButton
          title={t('jams.device.switchTitle')}
          action={() => {
            onDeviceChanged(device.deviceId);
          }}
          icon={OnIcon}
        >
          {#snippet textSnippet()}
            <span class="truncate">
              {device.label ||
                (device.deviceId === 'default'
                  ? t('jams.device.defaultSpeaker')
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
