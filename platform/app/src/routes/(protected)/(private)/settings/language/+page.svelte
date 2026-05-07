<script lang="ts">
  import { i18nContext, getServerDataContext } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import {
    currentProfileSettingsStore,
    updateProfileSettingsMutation,
  } from '@openpeeps/svelte/api';
  import { Button } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '@openpeeps/svelte';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';
  import { sleep } from '@openpeeps/common';

  const pageHeaderStore = getPageHeaderStore();
  let profileSettingsQuery = currentProfileSettingsStore();
  const currentProfile = getCurrentProfile();

  const updateSettings = updateProfileSettingsMutation();
  const toastStore = getToastStore();
  const { t } = i18nContext();

  const { serverInfo } = getServerDataContext();
  const communityDefaultLanguage = serverInfo?.communityConfig?.settings?.defaultLanguage ?? 'en';

  const AVAILABLE_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ];

  let language = $state<string>(communityDefaultLanguage);

  const handleSubmit = () =>
    updateSettings({
      id: currentProfile.id,
      language,
    })
      .then(() => {
        localStorage.setItem('openpeeps-language', language);
        toastStore.trigger(
          toast({
            message: t('settings.language.updateSuccess'),
            background: 'variant-filled-success',
          }),
        );
      })
      .then(() => sleep(5))
      .then(() => window.location.reload());

  $effect(() => {
    if ($profileSettingsQuery.data) {
      language = $profileSettingsQuery.data.language ?? communityDefaultLanguage;
    }
  });

  $effect(() => {
    pageHeaderStore.set({
      title: t('settings.language.title'),
    });
  });
</script>

<div class="flex flex-col gap-4 p-3">
  <div class="border p-4">
    <h4 class="my-4 text-lg font-semibold">
      {t('settings.language.title')}
    </h4>
    <span>{t('settings.language.languageDescription')}</span>
    <div class="flex-wrap items-center gap-x-4 gap-y-2 mt-4">
      {#each AVAILABLE_LANGUAGES as lang}
        <div>
          <input
            type="radio"
            class="h-4 w-4"
            bind:group={language}
            value={lang.code}
          />
          <span>
            {lang.name}
            {#if lang.code === communityDefaultLanguage}
              <span class="text-sm opacity-60">{t('settings.language.default')}</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </div>
  <Button variant="variant-ghost-primary" action={handleSubmit}>{t('common.form.save')}</Button>
</div>
