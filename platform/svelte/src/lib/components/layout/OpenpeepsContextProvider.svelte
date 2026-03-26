<script lang="ts">
  import {
    getPageHeaderStore,
    initializeNewPostStores,
    initializePageStores,
  } from '$lib/stores';
  import { onNavigate } from '$app/navigation';
  import { getServerInfo } from '$lib/server';

  initializeNewPostStores();
  initializePageStores();

  const { children } = $props();

  const pageHeader = getPageHeaderStore();

  const serverInfo = getServerInfo();

  onNavigate(() => {
    pageHeader.set({});
  });
</script>

<svelte:head>
  <title>
    {serverInfo.communityConfig?.info.name}{$pageHeader
      ? `${typeof $pageHeader.title === 'string' ? ' - ' + $pageHeader.title : ''}`
      : ''}
  </title>
</svelte:head>
{@render children?.()}
