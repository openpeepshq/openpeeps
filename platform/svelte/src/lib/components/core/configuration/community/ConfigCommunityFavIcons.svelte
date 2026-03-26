<script lang="ts">
  import { updateConfigMutation } from '$lib/api';
  import type { CommunityConfig } from '@openpeeps/common/types';
  import { uploadMediaFileMutation } from '$lib/api';
  import { i18nContext } from '$lib/components/i18n';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import ImageInput from '../pieces/ImageInput.svelte';
  import { convertToWebpIfHeic, toaster } from '$lib/utils';
  import { Button } from '@openpeeps/ui';
  import { diff } from 'deep-object-diff';
  import equal from 'fast-deep-equal';

  const { t } = i18nContext();
  const pageHeaderStore = getPageHeaderStore();

  const updateConfig = updateConfigMutation({
    namespace: 'allpeep',
    name: 'community',
  });

  let { defaults }: { defaults: CommunityConfig } = $props();
  let updatedConfig: CommunityConfig = $state(structuredClone(defaults));
  const toast = toaster();

  const uploadMediaFile = uploadMediaFileMutation();

  const setIcon = async (event: Event, mobile = false) => {
    const file = (event.currentTarget as HTMLInputElement).files?.item(0);

    if (file) {
      const processedFile = await convertToWebpIfHeic(file);

      const icon = await uploadMediaFile({
        file: processedFile,
        usage: t('configuration.community.icon'),
      }).then((ma) => ma.url);
      if (mobile) updatedConfig.theme.mobileIcon = icon;
      else updatedConfig.theme.icon = icon;
    }
  };

  const setIconUrl = (event: Event) => setIcon(event);
  const setMobileIconUrl = (event: Event) => setIcon(event, true);

  pageHeaderStore.set({
    title: 'Community Customization - Favicons',
  });

  const handleSubmit = () =>
    updateConfig({
      config: diff(defaults, updatedConfig) as CommunityConfig,
    }).then(() => {
      toast({
        message: t('configuration.community.updateSuccess'),
        type: 'success',
      });
      window.location.reload();
    });
</script>

<div class="relative mb-20 h-full w-full">
  <div>
    <div>
      <p>
        {t('configuration.community.favicons.title')}
      </p>
      <div class="border p-4">
        <h4 class="my-4">
          {t('configuration.community.favicons.description')}
        </h4>
        <div class="mb-2 flex flex-wrap gap-x-6 gap-y-2">
          <img
            src="/img/light-mode-favicon.png"
            alt={t('configuration.community.lightModeFavicon')}
          />
          <img
            src="/img/dark-mode-favicon.png"
            alt={t('configuration.community.darkModeFavicon')}
          />
        </div>
        <div class="mb-2 flex gap-x-6">
          <span>{t('configuration.community.currentIcon')}:</span>
          <img
            class="size-8"
            alt={t('configuration.community.icon')}
            src={updatedConfig.theme?.icon ??
              defaults.theme?.icon ??
              '/pwa/icons/128x128.png'}
          />
        </div>
        <ImageInput
          name="icon"
          title={t('configuration.community.upload')}
          onChange={setIconUrl}
        />
        <p class="py-3 text-sm">
          {t('configuration.community.iconRequirements')}
        </p>
      </div>
      <div class="border p-4">
        <h4 class="my-4">{t('configuration.community.mobileFavicon')}</h4>

        <div class="mb-2 flex flex-wrap gap-x-6 gap-y-2">
          <img
            src="/img/mobile-favicon-view-one.png"
            alt={t('configuration.community.lightModeFavicon')}
          />
          <img
            src="/img/mobile-favicon-view-two.png"
            alt={t('configuration.community.darkModeFavicon')}
          />
        </div>
        <div class="mb-2 flex items-center gap-x-6">
          <span>{t('configuration.community.currentIcon')}:</span>
          <img
            class="size-12"
            alt={t('configuration.community.icon')}
            src={updatedConfig.theme?.mobileIcon ?? defaults.theme?.mobileIcon}
          />
        </div>
        <ImageInput
          name="mobile-icon"
          title={t('configuration.community.upload')}
          onChange={setMobileIconUrl}
        />
        <p class="py-3 text-sm">
          {t('configuration.community.iconRequirements')}
        </p>
      </div>
    </div>
  </div>
  <Button
    variant="variant-ghost-primary"
    class="w-full"
    action={handleSubmit}
    disabled={equal(defaults, updatedConfig)}>Save</Button
  >
</div>
