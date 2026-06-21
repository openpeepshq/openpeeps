<script lang="ts">
  import { SlideToggle } from '@skeletonlabs/skeleton';
  import { i18nContext } from '$lib/components/i18n';
  import {
    type NotificationType,
    notificationDefaults,
    type ProfileNotificationSettings,
  } from '@openpeeps/common';

  const { t } = i18nContext();

  interface Props {
    settings?: ProfileNotificationSettings;
    notificationType: NotificationType;
    onChange: (settings: ProfileNotificationSettings) => void;
  }

  const {
    notificationType,
    settings = notificationType?.defaultSettings ?? notificationDefaults,
    onChange,
  }: Props = $props();

  const type = notificationType.type;

  const handleChange = (
    action: 'create' | 'push' | 'email',
    value: boolean,
  ) => {
    if (!value && action === 'create') {
      settings.create = false;
      settings.push = false;
      settings.email = false;
    } else {
      settings[action] = value;
    }
    onChange(settings);
  };
</script>

<div class="bg-surface-100 mb-3 mt-4 w-full rounded-md p-3">
  <p class="mb-2 font-bold">
    {t(`settings.notifications.types.${type}.label`, { defaultValue: type })}:
  </p>
  {#each ['create', 'push', 'email'] as const as action (action)}
    <div class="mb-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">
            {t(`settings.notifications.${action}`)}
          </p>
        </div>
        <SlideToggle
          size="sm"
          name="slide"
          checked={settings?.[action] ?? false}
          on:change={(e) =>
            handleChange(action, (e.target as HTMLInputElement).checked)}
          background="bg-surface-300"
          active="bg-primary-500"
        />
      </div>
    </div>
  {/each}
</div>
