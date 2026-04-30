<script lang="ts">
  import {
    getPageHeaderStore,
    initializeNewPostStores,
    initializePageStores,
  } from '$lib/stores';
  import { onNavigate } from '$app/navigation';
  import { getServerInfo } from '$lib/server';
  import { onDestroy } from 'svelte';
  import { markPostsSeenMutation } from '$lib/api';
  import {
    createPostViewCounterContext,
    setPostViewCounterContext,
  } from '$lib/utils/postViewCounter';

  initializeNewPostStores();
  initializePageStores();

  const { children } = $props();

  const pageHeader = getPageHeaderStore();

  const serverInfo = getServerInfo();
  const markPostsSeen = markPostsSeenMutation();
  const postViewCounterContext = createPostViewCounterContext(async (postIds) => {
    await markPostsSeen({ postIds });
  });
  setPostViewCounterContext(postViewCounterContext);

  onNavigate(() => {
    pageHeader.set({});
  });

  onDestroy(() => {
    postViewCounterContext.destroy();
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
