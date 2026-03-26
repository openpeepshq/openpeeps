<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { configStore } from '@openpeeps/svelte/api';
  import { ConfigCommunityFavIcons } from '@openpeeps/svelte/components';
  import { Loader } from '@openpeeps/ui';

  const configQuery = configStore('allpeep', 'community');

  const pageHeaderStore = getPageHeaderStore();

  pageHeaderStore.set({
    title: 'Profile Fields',
  });
</script>

<div class="p-4">
  <Loader queries={[$configQuery]}>
    {#if $configQuery.data}
      <ConfigCommunityFavIcons defaults={$configQuery.data.config} />
    {/if}
  </Loader>
</div>
