<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { configStore } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader, ConfigCommunityTheme } from '@openpeeps/svelte/components';

  const configQuery = configStore('allpeep', 'community');

  const pageHeaderStore = getPageHeaderStore();

  pageHeaderStore.set({
    title: 'Community Theme',
  });
</script>

<div class="p-4">
  <AccessDeniedLoader queries={[$configQuery]}>
    {#if $configQuery.data}
      <ConfigCommunityTheme defaults={$configQuery.data.config} />
    {/if}
  </AccessDeniedLoader>
</div>
