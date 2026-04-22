<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { configStore } from '@openpeeps/svelte/api';
  import {
    AccessDeniedLoader,
    ConfigCommunityProfileFields,
  } from '@openpeeps/svelte/components';
  import { i18nContext } from '@openpeeps/svelte/components';

  const configQuery = configStore('openpeeps', 'community');
  const { t } = i18nContext();

  const pageHeaderStore = getPageHeaderStore();

  pageHeaderStore.set({
    title: t('configuration.profileFields.title'),
  });
</script>

<div class="p-4">
  <AccessDeniedLoader queries={[$configQuery]}>
    <div>
      {t('configuration.profileFields.description')}
    </div>
    {#if $configQuery.data}
      <ConfigCommunityProfileFields
        communityConfig={$configQuery.data.config}
      />
    {/if}
  </AccessDeniedLoader>
</div>
