<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { configStore } from '@openpeeps/svelte/api';
  import { ConfigCommunityWelcomeEmail } from '@openpeeps/svelte/components';
  import { Loader } from '@openpeeps/ui';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();

  const configQuery = configStore('allpeep', 'community');

  const pageHeaderStore = getPageHeaderStore();

  pageHeaderStore.set({
    title: t('configuration.community.welcomeEmail.title'),
  });
</script>

<div class="p-4">
  <Loader queries={[$configQuery]}>
    {#if $configQuery.data}
      <ConfigCommunityWelcomeEmail defaults={$configQuery.data.config} />
    {/if}
  </Loader>
</div>
