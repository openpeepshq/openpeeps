<script lang="ts">
  import { i18nContext } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import {
    currentProfileSettingsStore,
    updateProfileSettingsMutation,
  } from '@openpeeps/svelte/api';
  import { Button } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '@openpeeps/svelte';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';
  import { sleep, THEME_OPTIONS, type ThemeOptions } from '@openpeeps/common';

  const pageHeaderStore = getPageHeaderStore();
  let profileSettingsQuery = currentProfileSettingsStore();
  const currentProfile = getCurrentProfile();

  let profileSettings = $profileSettingsQuery.data;

  const updateSettings = updateProfileSettingsMutation();
  const toastStore = getToastStore();
  const { t } = i18nContext();

  let theme = $state<ThemeOptions | undefined>(profileSettings?.theme);

  const handleSubmit = () =>
    updateSettings({
      id: currentProfile.id,
      theme: theme,
    })
      .then(() =>
        toastStore.trigger(
          toast({
            message: t('settings.theme.updateSuccess'),
            background: 'variant-filled-success',
          }),
        ),
      )
      .then(() => sleep(5))
      .then(() => window.location.reload());

  $effect(() => {
    if ($profileSettingsQuery.data) {
      theme = $profileSettingsQuery.data.theme;
    }
  });

  $effect(() => {
    pageHeaderStore.set({
      title: t('settings.theme.title'),
    });
  });
</script>

<div class="flex flex-col gap-4 p-3">
  <div class="border p-4">
    <h4 class="my-4 text-lg font-semibold">
      {t('settings.theme.title')}
    </h4>
    <span>{t('settings.theme.themeDescription')}</span>
    <div class="flex-wrap items-center gap-x-4 gap-y-2">
      {#each THEME_OPTIONS as option}
        <div>
          <input
            type="radio"
            class="h-4 w-4"
            bind:group={theme}
            value={option}
          />
          <span>{t(`settings.theme.${option}.mode`)}</span>
        </div>
      {/each}
    </div>
  </div>
  <Button variant="variant-ghost-primary" action={handleSubmit}>Save</Button>
</div>
