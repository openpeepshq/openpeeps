<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { updateConfigMutation } from '$lib/api';
  import { type CommunityConfig } from '@openpeeps/common/types';
  import { diff } from 'deep-object-diff';
  import { toast } from '$lib/utils/toast';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
  const toastStore = getToastStore();

  const updateConfig = updateConfigMutation({
    namespace: 'openpeeps',
    name: 'community',
  });

  let { defaults }: { defaults: CommunityConfig } = $props();
  let communityConfig: CommunityConfig = $state(structuredClone(defaults));

  const DEFAULT_LANGUAGE = 'en';

  const AVAILABLE_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ];

  let selectedLanguage = $state(communityConfig.settings?.defaultLanguage ?? DEFAULT_LANGUAGE);

  const handleSubmit = () => {
    communityConfig.settings = {
      ...communityConfig.settings,
      defaultLanguage: selectedLanguage,
    };
    return updateConfig({
      config: diff(defaults, communityConfig) as CommunityConfig,
    }).then(() =>
      toastStore.trigger(
        toast({
          message: t('configuration.community.language.updateSuccess'),
          background: 'variant-filled-success',
        }),
      ),
    );
  };

  let hasChanges = $derived(selectedLanguage !== (defaults.settings?.defaultLanguage ?? DEFAULT_LANGUAGE));
</script>

<div class="flex flex-col gap-4">
  <div class="border p-4">
    <h4 class="my-4 text-lg font-semibold">
      {t('configuration.community.language.title')}
    </h4>
    <span>{t('configuration.community.language.languageDescription')}</span>
    <div class="flex-wrap items-center gap-x-4 gap-y-2 mt-4">
      {#each AVAILABLE_LANGUAGES as lang}
        <div>
          <input
            type="radio"
            class="h-4 w-4"
            bind:group={selectedLanguage}
            value={lang.code}
          />
          <span>
            {lang.name}
            {#if lang.code === DEFAULT_LANGUAGE}
              <span class="text-sm opacity-60">{t('settings.language.default')}</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </div>
  <Button variant="variant-filled-primary" action={handleSubmit} disabled={!hasChanges}>
    {t('common.form.save')}
  </Button>
</div>
